import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get('SUPABASE_URL')!;
const S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const PENNY_HOST='pennyworth.cloudsales.app';
const PENNY_ORIGIN='https://pennyworth.cloudsales.app';
const PENNY_GATE='7639cce3-e0aa-487e-884e-d836fdc149c1';
const PUBLIC_DATA='https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/public-landing-data';
const MIN_REVIEW_CHAT_SCORE=80;

const clean=(v:any,n=1000)=>String(v??'').trim().slice(0,n);
const cors={
  'access-control-allow-origin':PENNY_ORIGIN,
  'access-control-allow-methods':'POST,OPTIONS',
  'access-control-allow-headers':'content-type',
  'vary':'origin',
  'x-content-type-options':'nosniff'
};
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,'content-type':'application/json;charset=utf-8','cache-control':'no-store'}});
async function hash(v:string){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function hmac(secret:string,v:string){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const s=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(v));return[...new Uint8Array(s)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function equal(a:string,b:string){if(!a||!b||a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
function decode64url(v:string){let s=v.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return atob(s)}
function token(){const a=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function readEdgeSecret(){const{data:set}=await svc.from('internal_settings').select('secret_id').eq('setting_key','cloudsales_edge_token').maybeSingle();if(!set?.secret_id)return null;const{data}=await svc.rpc('service_read_secret',{p_secret_id:set.secret_id});return data?String(data):null}
async function published(host:string){return(await svc.from('landing_pages').select('id,organization_id,hostname,status').eq('hostname',host).eq('status','published').maybeSingle()).data}
async function rate(key:string,limit:number,window:number){const{data}=await svc.rpc('consume_rate_limit',{p_bucket_key:key,p_limit:limit,p_window_seconds:window});return data===true}
async function addInbound(org:string,conv:string,contactId:string|null,body:string,external:string){const at=new Date().toISOString();await svc.from('universal_messages').upsert({organization_id:org,conversation_id:conv,contact_id:contactId,source_provider:'cloudsales_webchat',external_message_id:external,direction:'inbound',channel:'webchat',message_type:'text',body:clean(body,3000),content_type:'text/plain',status:'received',occurred_at:at,metadata:{webchat:true,pennyworth:true}},{onConflict:'organization_id,source_provider,external_message_id'});const{data:c}=await svc.from('universal_conversations').select('unread_count').eq('id',conv).eq('organization_id',org).maybeSingle();await svc.from('universal_conversations').update({unread_count:Number(c?.unread_count||0)+1,last_message_at:at,last_message_preview:clean(body,500)}).eq('id',conv).eq('organization_id',org)}

async function verifyGrant(req:Request,grant:string){
  const parts=grant.split('.');if(parts.length!==2)return null;
  const [raw,sig]=parts,edge=await readEdgeSecret();if(!edge)return null;
  const expected=await hmac(edge,raw);if(!equal(sig,expected))return null;
  let p:any;try{p=JSON.parse(decode64url(raw))}catch{return null}
  const now=Date.now(),iat=Number(p.iat||0),exp=Number(p.exp||0);
  if(p.v!==1||p.host!==PENNY_HOST||!p.attempt_id||!p.contact_id||!iat||!exp||iat>now+30000||iat<now-360000||exp<=now||exp>now+360000)return null;
  const ua=await hash(req.headers.get('user-agent')||'unknown');if(p.ua_hash&&p.ua_hash!==ua)return null;
  const{data:a}=await svc.from('lead_attempts').select('id,organization_id,gate_id,decision,quality_score,accepted_contact_id,reasons').eq('id',p.attempt_id).eq('gate_id',PENNY_GATE).in('decision',['accept','challenge']).maybeSingle();
  if(!a||a.accepted_contact_id!==p.contact_id)return null;
  if(a.decision==='challenge'&&Number(a.quality_score||0)<MIN_REVIEW_CHAT_SCORE)return null;
  return{payload:p,attempt:a,ua,token_hash:await hash(grant)};
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  const origin=req.headers.get('origin')||'';if(origin!==PENNY_ORIGIN)return json({error:'origin_not_allowed'},403);
  let b:any;try{b=await req.json()}catch{return json({error:'invalid_json'},400)}
  const action=clean(b.action,40);

  if(action!=='chat.start'){
    const r=await fetch(PUBLIC_DATA,{method:'POST',headers:{'content-type':'application/json','origin':PENNY_ORIGIN,'user-agent':req.headers.get('user-agent')||''},body:JSON.stringify(b)});
    const text=await r.text();return new Response(text,{status:r.status,headers:{...cors,'content-type':r.headers.get('content-type')||'application/json;charset=utf-8','cache-control':'no-store'}});
  }

  const host=clean(b.hostname,255).toLowerCase();if(host!==PENNY_HOST)return json({error:'hostname_not_allowed'},403);
  const landing=await published(host);if(!landing)return json({error:'landing_not_found'},404);
  const grant=clean(b.chat_grant,5000);if(!grant)return json({error:'secure_grant_required'},403);
  const verified=await verifyGrant(req,grant);if(!verified)return json({error:'invalid_or_expired_grant'},403);
  if(verified.attempt.organization_id!==landing.organization_id)return json({error:'grant_organization_mismatch'},403);

  const ip=clean(req.headers.get('x-forwarded-for')?.split(',')[0]||req.headers.get('cf-connecting-ip')||'',100),fp=await hash(`${ip}|${req.headers.get('user-agent')||''}|${host}`);
  if(!(await rate(`webchat:secure-start:${landing.organization_id}:${fp}`,12,600)))return json({error:'rate_limited'},429);
  const{error:ge}=await svc.from('webchat_entry_grants').insert({organization_id:landing.organization_id,hostname:PENNY_HOST,lead_attempt_id:verified.attempt.id,contact_id:verified.payload.contact_id,token_hash:verified.token_hash,ip_hash:ip?await hash(ip):null,user_agent_hash:verified.ua,expires_at:new Date(verified.payload.exp).toISOString(),consumed_at:new Date().toISOString()});
  if(ge){if(String(ge.code)==='23505')return json({error:'grant_already_used'},409);return json({error:'grant_audit_failed'},500)}

  const sid=crypto.randomUUID(),external=`web:${sid}`,at=new Date().toISOString(),reviewEntry=verified.attempt.decision==='challenge';
  const{data:conv,error}=await svc.from('universal_conversations').insert({organization_id:landing.organization_id,contact_id:verified.payload.contact_id,source_provider:'cloudsales_webchat',external_conversation_id:external,primary_channel:'webchat',status:'open',unread_count:0,last_message_at:at,metadata:{hostname:host,landing_id:landing.id,session_id:sid,secure_entry:true,lead_attempt_id:verified.attempt.id,review_entry:reviewEntry}}).select('id').single();
  if(error||!conv)return json({error:'conversation_create_failed'},500);
  const raw=token(),{error:se}=await svc.rpc('service_webchat_session_create',{p_organization_id:landing.organization_id,p_conversation_id:conv.id,p_token_hash:await hash(raw),p_client_fingerprint:fp,p_expires_at:new Date(Date.now()+7*86400000).toISOString(),p_metadata:{hostname:host,landing_id:landing.id,secure_entry:true,lead_attempt_id:verified.attempt.id,review_entry:reviewEntry}});
  if(se){await svc.from('universal_conversations').delete().eq('id',conv.id);return json({error:'session_create_failed'},500)}
  const message=clean(b.message,3000);if(message)await addInbound(landing.organization_id,conv.id,verified.payload.contact_id,message,`web:${sid}:${crypto.randomUUID()}`);
  return json({session_token:raw,conversation_id:conv.id,expires_in:604800,review_entry:reviewEntry},201);
});
