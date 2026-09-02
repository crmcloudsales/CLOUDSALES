const BASE='https://zernio.com/api/v1';
const PLATFORMS=new Set(['facebook','instagram','linkedin','twitter','tiktok','youtube','threads','pinterest','reddit','bluesky','googlebusiness','telegram','snapchat','discord','whatsapp']);

async function readSecret(svc:any,key:string){
  const {data:s}=await svc.from('internal_settings').select('secret_id').eq('setting_key',key).maybeSingle();
  if(!s?.secret_id)return null;
  const {data}=await svc.rpc('service_read_secret',{p_secret_id:s.secret_id});
  return data?String(data):null;
}
async function key(svc:any){return Deno.env.get('ZERNIO_API_KEY')||await readSecret(svc,'zernio_api_key_cloudsales')||null}
async function call(svc:any,path:string,init:RequestInit={}){
  const apiKey=await key(svc); if(!apiKey) throw new Error('zernio_not_configured');
  const r=await fetch(BASE+path,{...init,headers:{Authorization:`Bearer ${apiKey}`,'content-type':'application/json',...(init.headers||{})}});
  const t=await r.text(); let d:any={}; try{d=t?JSON.parse(t):{}}catch{d={raw:t}}
  if(!r.ok) throw Object.assign(new Error(String(d?.error||d?.message||`zernio_${r.status}`)),{status:r.status,data:d});
  return d;
}
export async function ensureZernioProfile(svc:any,organizationId:string){
  const {data:existing}=await svc.from('integration_aggregator_profiles').select('*').eq('organization_id',organizationId).eq('provider_key','zernio').maybeSingle();
  if(existing?.external_profile_id&&existing.status==='ready') return existing;
  const {data:org}=await svc.from('organizations').select('name').eq('id',organizationId).maybeSingle();
  try{
    const d=await call(svc,'/profiles',{method:'POST',body:JSON.stringify({name:`CloudSales · ${String(org?.name||organizationId).slice(0,80)}`,description:`CloudSales tenant ${organizationId}`})});
    const external=String(d?.profile?._id||d?._id||''); if(!external) throw new Error('zernio_profile_id_missing');
    const {data:row,error}=await svc.from('integration_aggregator_profiles').upsert({organization_id:organizationId,provider_key:'zernio',external_profile_id:external,status:'ready',last_error:null,metadata:{created_by:'cloudsales_integration_engine'},updated_at:new Date().toISOString()},{onConflict:'organization_id,provider_key'}).select('*').single();
    if(error) throw error; return row;
  }catch(e){
    await svc.from('integration_aggregator_profiles').upsert({organization_id:organizationId,provider_key:'zernio',status:'error',last_error:String((e as Error).message||e).slice(0,300),updated_at:new Date().toISOString()},{onConflict:'organization_id,provider_key'});
    throw e;
  }
}
export async function startZernioConnect(svc:any,organizationId:string,platformRaw:string,redirectUrl:string){
  const platform=String(platformRaw||'').toLowerCase(); if(!PLATFORMS.has(platform)) throw new Error('unsupported_zernio_platform');
  const p=await ensureZernioProfile(svc,organizationId);
  const qs=new URLSearchParams({profileId:p.external_profile_id,redirect_url:redirectUrl});
  const d=await call(svc,`/connect/${encodeURIComponent(platform)}?${qs.toString()}`,{method:'GET'});
  const authUrl=String(d?.authUrl||d?.auth_url||''); if(!authUrl.startsWith('https://')) throw new Error('zernio_auth_url_missing');
  return {provider:'zernio',platform,profile_id:p.external_profile_id,auth_url:authUrl};
}
export async function verifyZernioConnect(svc:any,organizationId:string,input:any){
  const platform=String(input?.connected||input?.platform||'').toLowerCase(),accountId=String(input?.accountId||input?.account_id||'');
  if(!PLATFORMS.has(platform)||!accountId) throw new Error('invalid_zernio_callback');
  const {data:p}=await svc.from('integration_aggregator_profiles').select('*').eq('organization_id',organizationId).eq('provider_key','zernio').maybeSingle();
  if(!p?.external_profile_id) throw new Error('zernio_profile_missing');
  if(input?.profileId&&String(input.profileId)!==String(p.external_profile_id)) throw new Error('zernio_profile_mismatch');
  const qs=new URLSearchParams({profileId:p.external_profile_id,platform,status:'connected'});
  const d=await call(svc,`/accounts?${qs.toString()}`,{method:'GET'}); const accounts=Array.isArray(d?.accounts)?d.accounts:[];
  const found=accounts.find((a:any)=>String(a?.id||a?._id||'')===accountId); if(!found) throw new Error('zernio_account_not_verified');
  const current=Array.isArray(p.metadata?.connected_accounts)?p.metadata.connected_accounts:[];
  const normalized={account_id:accountId,platform,username:String(found?.username||input?.username||''),display_name:String(found?.displayName||''),verified_at:new Date().toISOString()};
  const next=[...current.filter((x:any)=>String(x?.account_id)!==accountId),normalized];
  const metadata={...(p.metadata||{}),connected_accounts:next,last_verified_at:new Date().toISOString()};
  await svc.from('integration_aggregator_profiles').update({status:'ready',last_error:null,metadata,updated_at:new Date().toISOString()}).eq('id',p.id);
  return {verified:true,provider:'zernio',profile_id:p.external_profile_id,account:normalized,connected_accounts:next.length};
}
export async function zernioConfigured(svc:any){return Boolean(await key(svc))}
