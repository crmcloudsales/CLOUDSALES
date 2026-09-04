const BUFFER_API='https://api.buffer.com';

async function readSecret(svc:any,key:string){
  const {data:s}=await svc.from('internal_settings').select('secret_id').eq('setting_key',key).maybeSingle();
  if(!s?.secret_id)return null;
  const {data}=await svc.rpc('service_read_secret',{p_secret_id:s.secret_id});
  return data?String(data):null;
}

async function token(svc:any,organizationId:string){
  const env=Deno.env.get('BUFFER_API_KEY');
  if(env)return env;
  const internal=await readSecret(svc,'buffer_api_key_cloudsales');
  if(internal)return internal;
  const {data:c}=await svc.from('connections').select('id').eq('organization_id',organizationId).eq('provider_key','buffer').eq('status','connected').maybeSingle();
  if(!c?.id)return null;
  const {data:s}=await svc.from('connection_secrets').select('access_token_secret_id').eq('connection_id',c.id).maybeSingle();
  if(!s?.access_token_secret_id)return null;
  const {data}=await svc.rpc('service_read_secret',{p_secret_id:s.access_token_secret_id});
  return data?String(data):null;
}

async function gql(svc:any,organizationId:string,query:string,variables:Record<string,unknown>={}){
  const apiKey=await token(svc,organizationId);
  if(!apiKey)throw new Error('buffer_not_configured');
  const r=await fetch(BUFFER_API,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({query,variables})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d?.errors?.length)throw Object.assign(new Error(String(d?.errors?.[0]?.message||`buffer_${r.status}`)),{status:r.status,data:d});
  return d?.data;
}

export async function bufferConfigured(svc:any,organizationId:string){return Boolean(await token(svc,organizationId))}

export async function listBufferChannels(svc:any,organizationId:string){
  const q=`query CloudSalesChannels { account { organizations { id name channels { id name service } } } }`;
  const data=await gql(svc,organizationId,q);
  const orgs=Array.isArray(data?.account?.organizations)?data.account.organizations:[];
  const channels=orgs.flatMap((o:any)=>(Array.isArray(o?.channels)?o.channels:[]).map((c:any)=>({...c,organizationId:o.id,organizationName:o.name})));
  return {organizations:orgs.map((o:any)=>({id:o.id,name:o.name})),channels};
}

function assetsGraphQL(assets:any[]){
  if(!assets?.length)return '';
  const rows=assets.map(a=>{
    const type=String(a?.type||'image');
    const url=String(a?.url||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"');
    if(!url.startsWith('https://'))throw new Error('buffer_asset_requires_public_https_url');
    if(type==='video')return `{ video: { url: "${url}" } }`;
    if(type==='document')return `{ document: { url: "${url}" } }`;
    if(type==='link')return `{ link: { url: "${url}" } }`;
    return `{ image: { url: "${url}" } }`;
  });
  return `assets: [${rows.join(',')}]`;
}

export async function publishBuffer(svc:any,organizationId:string,input:any){
  const channelId=String(input?.provider_channel_id||'');
  if(!channelId)throw new Error('buffer_channel_id_required');
  const text=String(input?.text||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n');
  const due=String(input?.scheduled_for||'');
  const scheduling=due?`schedulingType: automatic mode: customScheduled dueAt: "${due.replace(/"/g,'')}"`:`schedulingType: automatic mode: shareNow`;
  const assets=assetsGraphQL(Array.isArray(input?.assets)?input.assets:[]);
  const q=`mutation CloudSalesCreatePost { createPost(input:{ text:"${text}" channelId:"${channelId.replace(/"/g,'')}" ${scheduling} ${assets} }) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;
  const data=await gql(svc,organizationId,q);
  const result=data?.createPost;
  if(result?.message)throw new Error(`buffer_publish_failed:${String(result.message)}`);
  const post=result?.post;
  if(!post?.id)throw new Error('buffer_post_id_missing');
  return {provider_key:'buffer',external_post_id:String(post.id),status:due?'scheduled':'published',raw:post};
}
