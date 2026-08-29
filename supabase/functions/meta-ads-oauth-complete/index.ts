import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!;
const A=Deno.env.get("SUPABASE_ANON_KEY")!;
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PROVIDER="meta_ads";
const DEFAULT_VERSION="v24.0";
const REQUIRED=new Set(["ads_read","ads_management"]);
const ORIGINS=new Set(["https://cloudsales.app","https://www.cloudsales.app","https://app.cloudsales.app","http://localhost:3000","http://localhost:5173"]);
function cors(o:string|null){const v=o&&ORIGINS.has(o)?o:"https://app.cloudsales.app";return{"Access-Control-Allow-Origin":v,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}}
function json(b:unknown,s=200,o:string|null=null){return new Response(JSON.stringify(b),{status:s,headers:{...cors(o),"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}})}
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
const clean=(v:any,n=300)=>String(v??"").trim().slice(0,n);

Deno.serve(async req=>{
  const o=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(o)});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405,o);
  if(o&&!ORIGINS.has(o))return json({error:"origin_not_allowed"},403,o);
  const auth=req.headers.get("authorization");if(!auth)return json({error:"missing_authorization"},401,o);
  const uc=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const{data:ud}=await uc.auth.getUser();const user=ud.user;if(!user)return json({error:"invalid_session"},401,o);
  let b:any;try{b=await req.json()}catch{return json({error:"invalid_json"},400,o)}
  const org=String(b.organization_id||""),attemptId=String(b.oauth_attempt_id||""),state=String(b.state||"");
  if(!org||!attemptId||!state)return json({error:"missing_required_fields"},400,o);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const{data:m}=await svc.from("organization_members").select("role,status").eq("organization_id",org).eq("user_id",user.id).maybeSingle();
  if(!m||m.status!=="active"||!["owner","admin"].includes(String(m.role)))return json({error:"forbidden"},403,o);
  const stateHash=await sha(state);
  const{data:a}=await svc.from("oauth_states").select("id,state_hash,organization_id,provider_key,user_id,redirect_to,expires_at,consumed_at,callback_code_secret_id,callback_error,metadata").eq("id",attemptId).eq("organization_id",org).eq("provider_key",PROVIDER).eq("user_id",user.id).maybeSingle();
  if(!a||a.state_hash!==stateHash||a.consumed_at||new Date(a.expires_at).getTime()<=Date.now())return json({error:"invalid_oauth_attempt"},400,o);
  if(a.callback_error)return json({error:"provider_callback_error",detail:a.callback_error},422,o);
  let code=String(b.code||"").trim();if(!code&&a.callback_code_secret_id){const{data}=await svc.rpc("service_read_secret",{p_secret_id:a.callback_code_secret_id});if(data)code=String(data)}
  if(!code)return json({error:"oauth_code_not_received"},409,o);
  const{data:cred}=await svc.from("provider_app_credentials").select("client_id,client_secret_secret_id,redirect_uri,enabled,metadata").eq("provider_key",PROVIDER).maybeSingle();
  if(!cred?.enabled||!cred.client_id||!cred.client_secret_secret_id||!cred.redirect_uri)return json({error:"meta_ads_platform_not_configured"},503,o);
  if(a.redirect_to&&a.redirect_to!==cred.redirect_uri)return json({error:"redirect_uri_mismatch"},400,o);
  const{data:clientSecret}=await svc.rpc("service_read_secret",{p_secret_id:cred.client_secret_secret_id});if(!clientSecret)return json({error:"provider_secret_unavailable"},503,o);
  const version=String(a.metadata?.graph_api_version||cred.metadata?.graph_api_version||DEFAULT_VERSION);
  try{
    const f=new URLSearchParams({client_id:String(cred.client_id),client_secret:String(clientSecret),redirect_uri:String(cred.redirect_uri),code});
    const tr=await fetch(`https://graph.facebook.com/${version}/oauth/access_token`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded",accept:"application/json"},body:f});
    const short=await tr.json().catch(()=>({}));if(!tr.ok||!short.access_token)throw new Error(`meta_ads_oauth_exchange_failed:${tr.status}:${clean(short?.error?.message)}`);
    const lf=new URLSearchParams({grant_type:"fb_exchange_token",client_id:String(cred.client_id),client_secret:String(clientSecret),fb_exchange_token:String(short.access_token)});
    const lr=await fetch(`https://graph.facebook.com/${version}/oauth/access_token`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded",accept:"application/json"},body:lf});
    const long=await lr.json().catch(()=>({}));
    const token=String(lr.ok&&long.access_token?long.access_token:short.access_token);
    const expiresIn=Number(lr.ok&&long.expires_in?long.expires_in:short.expires_in||3600);
    async function graph(path:string){const r=await fetch(`https://graph.facebook.com/${version}/${path}`,{headers:{Authorization:`Bearer ${token}`,accept:"application/json"}});const d=await r.json().catch(()=>({}));if(!r.ok||d?.error)throw new Error(`meta_ads_validation_failed:${r.status}:${clean(d?.error?.message)}`);return d}
    const[me,permissions,accounts]=await Promise.all([
      graph("me?fields=id,name"),
      graph("me/permissions"),
      graph("me/adaccounts?fields=id,name,account_status,currency,timezone_name,business&limit=100"),
    ]);
    const granted=(permissions?.data||[]).filter((x:any)=>String(x.status)==="granted").map((x:any)=>String(x.permission));
    const missing=[...REQUIRED].filter(x=>!granted.includes(x));
    if(missing.length)return json({error:"meta_ads_required_permissions_missing",missing,granted},409,o);
    const adAccounts=(accounts?.data||[]).map((x:any)=>({id:String(x.id||""),name:clean(x.name,200),account_status:x.account_status??null,currency:String(x.currency||"USD"),timezone_name:clean(x.timezone_name,120),business:x.business?{id:String(x.business.id||""),name:clean(x.business.name,200)}:null})).filter((x:any)=>x.id.startsWith("act_"));
    if(!adAccounts.length)return json({error:"meta_ads_no_accessible_accounts"},409,o);
    const fbUser=String(me?.id||"");if(!fbUser)throw new Error("meta_ads_user_validation_failed");
    const externalId=`meta_ads_user:${fbUser}`;
    const expiresAt=new Date(Date.now()+Math.max(300,expiresIn)*1000).toISOString();
    const metadata={connection_mode:"ads_management",graph_api_version:version,facebook_user_id:fbUser,facebook_user_name:clean(me?.name,200),candidate_ad_accounts:adAccounts,selected_ad_account_id:null,billing_mode:"provider_managed",billing_portal_url:"https://business.facebook.com/billing_hub",connected_at:new Date().toISOString(),long_lived_token:Boolean(lr.ok&&long.access_token)};
    let connectionId="";
    const{data:existing}=await svc.from("connections").select("id").eq("organization_id",org).eq("provider_key",PROVIDER).eq("external_account_id",externalId).maybeSingle();
    const payload={status:"connected",external_account_name:`${clean(me?.name,180)||"Meta"} · Meta Ads`,scopes:granted,expires_at:expiresAt,last_sync_at:new Date().toISOString(),metadata};
    if(existing?.id){connectionId=existing.id;const{error}=await svc.from("connections").update(payload).eq("id",connectionId);if(error)throw new Error("connection_update_failed")}
    else{const{data:c,error}=await svc.from("connections").insert({organization_id:org,provider_key:PROVIDER,external_account_id:externalId,created_by:user.id,...payload}).select("id").single();if(error||!c)throw new Error("connection_create_failed");connectionId=c.id}
    const{data:es}=await svc.from("connection_secrets").select("access_token_secret_id").eq("connection_id",connectionId).maybeSingle();let accessId=es?.access_token_secret_id;
    if(accessId)await svc.rpc("service_update_secret",{p_secret_id:accessId,p_secret:token,p_name:`cloudsales/meta_ads/${connectionId}/access`,p_description:"Meta Ads long-lived user access token"});
    else{const{data:id,error}=await svc.rpc("service_store_secret",{p_secret:token,p_name:`cloudsales/meta_ads/${connectionId}/access`,p_description:"Meta Ads long-lived user access token"});if(error||!id)throw new Error("token_storage_failed");accessId=id}
    await svc.from("connection_secrets").upsert({connection_id:connectionId,access_token_secret_id:accessId,refresh_token_secret_id:null,rotated_at:new Date().toISOString()},{onConflict:"connection_id"});
    await svc.from("oauth_states").update({consumed_at:new Date().toISOString(),metadata:{...(a.metadata||{}),completed:true,accessible_ad_accounts:adAccounts.length}}).eq("id",attemptId);
    if(a.callback_code_secret_id)await svc.rpc("service_update_secret",{p_secret_id:a.callback_code_secret_id,p_secret:crypto.randomUUID()+crypto.randomUUID(),p_name:`cloudsales/oauth/${attemptId}/consumed`,p_description:"Consumed OAuth authorization code"});
    await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"connection.oauth.connected",entity_type:"connection",entity_id:connectionId,connection_id:connectionId,success:true,context:{provider_key:PROVIDER,facebook_user_id:fbUser,accessible_ad_accounts:adAccounts.length,graph_api_version:version}});
    return json({connection:{id:connectionId,provider_key:PROVIDER,status:"connected",external_account_name:payload.external_account_name,expires_at:expiresAt,scopes:granted,accessible_ad_account_count:adAccounts.length}},200,o);
  }catch(e){const error=clean((e as Error).message,700);await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"connection.oauth.failed",entity_type:"oauth_state",entity_id:attemptId,success:false,context:{provider_key:PROVIDER,error}});return json({error},502,o)}
});
