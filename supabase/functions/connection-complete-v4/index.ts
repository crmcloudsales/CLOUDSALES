import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!,A=Deno.env.get("SUPABASE_ANON_KEY")!,S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGINS=new Set(["https://cloudsales.app","https://www.cloudsales.app","https://app.cloudsales.app","http://localhost:3000","http://localhost:5173"]);
const GOOGLE_PROVIDERS=new Set(["google_workspace","google_ads","youtube","google_business_profile"]);

function cors(o:string|null){const v=o&&ORIGINS.has(o)?o:"https://app.cloudsales.app";return{"Access-Control-Allow-Origin":v,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}}
function json(b:unknown,s=200,o:string|null=null){return new Response(JSON.stringify(b),{status:s,headers:{...cors(o),"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}})}
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
const cleanId=(v:any)=>String(v??"").replace(/\D/g,"");
const cleanScopes=(v:any,fallback:string[]=[])=>(String(v||"").trim()?String(v).split(/\s+/):fallback).map(String).filter(Boolean);

async function upsertConnection(svc:any,args:{organizationId:string;providerKey:string;externalId:string;externalName:string;scopes:string[];expiresAt:string|null;metadata:any;createdBy:string}){
  const {data:existing}=await svc.from("connections").select("id").eq("organization_id",args.organizationId).eq("provider_key",args.providerKey).eq("external_account_id",args.externalId).maybeSingle();
  const payload={status:"connected",external_account_name:args.externalName,scopes:args.scopes,expires_at:args.expiresAt,last_sync_at:new Date().toISOString(),metadata:args.metadata};
  if(existing?.id){
    const {error}=await svc.from("connections").update(payload).eq("id",existing.id);
    if(error)throw new Error("connection_update_failed");
    return String(existing.id)
  }
  const {data:c,error}=await svc.from("connections").insert({organization_id:args.organizationId,provider_key:args.providerKey,external_account_id:args.externalId,created_by:args.createdBy,...payload}).select("id").single();
  if(error||!c?.id)throw new Error("connection_create_failed");
  return String(c.id)
}

async function storeTokens(svc:any,connectionId:string,providerKey:string,accessToken:string,refreshToken:string|undefined){
  const {data:es}=await svc.from("connection_secrets").select("access_token_secret_id,refresh_token_secret_id").eq("connection_id",connectionId).maybeSingle();
  let accessId=es?.access_token_secret_id,refreshId=es?.refresh_token_secret_id;
  if(accessId){
    const {error}=await svc.rpc("service_update_secret",{p_secret_id:accessId,p_secret:accessToken,p_name:`cloudsales/${providerKey}/${connectionId}/access`,p_description:`${providerKey} OAuth access token`});if(error)throw error
  }else{
    const {data:id,error}=await svc.rpc("service_store_secret",{p_secret:accessToken,p_name:`cloudsales/${providerKey}/${connectionId}/access`,p_description:`${providerKey} OAuth access token`});if(error||!id)throw error||new Error("access_token_storage_failed");accessId=id
  }
  if(refreshToken){
    if(refreshId){const {error}=await svc.rpc("service_update_secret",{p_secret_id:refreshId,p_secret:refreshToken,p_name:`cloudsales/${providerKey}/${connectionId}/refresh`,p_description:`${providerKey} OAuth refresh token`});if(error)throw error}
    else{const {data:id,error}=await svc.rpc("service_store_secret",{p_secret:refreshToken,p_name:`cloudsales/${providerKey}/${connectionId}/refresh`,p_description:`${providerKey} OAuth refresh token`});if(error||!id)throw error||new Error("refresh_token_storage_failed");refreshId=id}
  }
  if(!accessId)throw new Error("token_storage_failed");
  await svc.from("connection_secrets").upsert({connection_id:connectionId,access_token_secret_id:accessId,refresh_token_secret_id:refreshId||null,rotated_at:new Date().toISOString()},{onConflict:"connection_id"});
  return {accessId,refreshId:refreshId||null}
}

async function linkTokens(svc:any,connectionId:string,accessId:string,refreshId:string|null){
  await svc.from("connection_secrets").upsert({connection_id:connectionId,access_token_secret_id:accessId,refresh_token_secret_id:refreshId,rotated_at:new Date().toISOString()},{onConflict:"connection_id"})
}

async function userInfo(accessToken:string){
  const r=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{Authorization:`Bearer ${accessToken}`,accept:"application/json"}});
  if(!r.ok)return {};
  return await r.json().catch(()=>({}))
}

async function youtubeInfo(accessToken:string){
  const u=new URL("https://www.googleapis.com/youtube/v3/channels");u.searchParams.set("part","id,snippet");u.searchParams.set("mine","true");u.searchParams.set("maxResults","50");
  const r=await fetch(u,{headers:{Authorization:`Bearer ${accessToken}`,accept:"application/json"}});if(!r.ok)return {ok:false,items:[]};const d=await r.json().catch(()=>({}));return {ok:true,items:Array.isArray(d?.items)?d.items:[]}
}

async function businessProfileInfo(accessToken:string){
  const r=await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts",{headers:{Authorization:`Bearer ${accessToken}`,accept:"application/json"}});if(!r.ok)return {ok:false,accounts:[]};const d=await r.json().catch(()=>({}));return {ok:true,accounts:Array.isArray(d?.accounts)?d.accounts:[]}
}

async function adsInfo(accessToken:string,developerToken:string){
  const r=await fetch("https://googleads.googleapis.com/v25/customers:listAccessibleCustomers",{headers:{Authorization:`Bearer ${accessToken}`,"developer-token":developerToken,accept:"application/json"}});const d=await r.json().catch(()=>({}));if(!r.ok||d?.error)return {ok:false,status:r.status,ids:[],detail:String(d?.error?.message||"").slice(0,400)};return {ok:true,status:r.status,ids:(d.resourceNames||[]).map((x:string)=>cleanId(x)).filter(Boolean),detail:""}
}

async function completeGoogle(args:{svc:any;org:string;provider:string;attemptId:string;attempt:any;code:string;user:any;origin:string|null}){
  const {svc,org,provider,attemptId,attempt:a,code,user,origin:o}=args;
  const {data:cred}=await svc.from("provider_app_credentials").select("client_id,client_secret_secret_id,redirect_uri,enabled,metadata").eq("provider_key",provider).maybeSingle();
  if(!cred?.enabled||!cred.client_id||!cred.client_secret_secret_id||!cred.redirect_uri)return json({error:`${provider}_platform_not_configured`},503,o);
  if(a.redirect_to&&a.redirect_to!==cred.redirect_uri)return json({error:"redirect_uri_mismatch"},400,o);
  const {data:clientSecret}=await svc.rpc("service_read_secret",{p_secret_id:cred.client_secret_secret_id});
  if(!clientSecret)return json({error:"google_platform_secret_unavailable"},503,o);

  const f=new URLSearchParams({grant_type:"authorization_code",client_id:String(cred.client_id),client_secret:String(clientSecret),redirect_uri:String(cred.redirect_uri),code});
  const tr=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded",accept:"application/json"},body:f});
  const token=await tr.json().catch(()=>({}));
  if(!tr.ok||!token.access_token){
    await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"connection.oauth.failed",entity_type:"oauth_state",entity_id:attemptId,success:false,context:{provider_key:provider,stage:"token_exchange",status:tr.status}});
    return json({error:"google_oauth_exchange_failed",provider_key:provider,status:tr.status},502,o)
  }

  const grantedScopes=cleanScopes(token.scope,Array.isArray(a.metadata?.scopes)?a.metadata.scopes:[]);
  const expiresAt=new Date(Date.now()+Number(token.expires_in||3600)*1000).toISOString();
  const info:any=await userInfo(String(token.access_token));
  const googleSub=String(info.sub||user.id),email=String(info.email||user.email||""),display=String(info.name||email||"Google");
  const linked:any[]=[];

  let externalId=`google:${googleSub}`,externalName=display,metadata:any={google_account_sub:googleSub,email,google_cloud_project_id:"cloudsales-507715",oauth_flow:"multi_user",connected_at:new Date().toISOString()};
  let discovery:any={};

  if(provider==="youtube"){
    const yt=await youtubeInfo(String(token.access_token));
    if(!yt.ok)return json({error:"youtube_api_validation_failed"},502,o);
    const first=yt.items[0];externalId=String(first?.id||`youtube_user:${googleSub}`);externalName=String(first?.snippet?.title||display||"YouTube");metadata={...metadata,channels:yt.items.map((x:any)=>({id:x.id,title:x?.snippet?.title||null})),selected_channel_id:first?.id||null}
  }else if(provider==="google_business_profile"){
    const bp=await businessProfileInfo(String(token.access_token));
    if(!bp.ok)return json({error:"google_business_profile_api_validation_failed"},502,o);
    const first=bp.accounts[0];externalId=String(first?.name||`gbp_user:${googleSub}`);externalName=String(first?.accountName||display||"Google Business Profile");metadata={...metadata,accounts:bp.accounts.map((x:any)=>({name:x.name,accountName:x.accountName||null,type:x.type||null})),selected_account:first?.name||null}
  }else if(provider==="google_ads"){
    const {data:devSetting}=await svc.from("internal_settings").select("secret_id").eq("setting_key","google_ads_developer_token").maybeSingle();
    if(!devSetting?.secret_id)return json({error:"google_ads_developer_token_required"},503,o);
    const {data:dev}=await svc.rpc("service_read_secret",{p_secret_id:devSetting.secret_id});if(!dev)return json({error:"google_ads_developer_token_unavailable"},503,o);
    const ads=await adsInfo(String(token.access_token),String(dev));if(!ads.ok)return json({error:"google_ads_api_validation_failed",status:ads.status,detail:ads.detail},502,o);if(!ads.ids.length)return json({error:"google_ads_no_accessible_customers"},409,o);
    externalId=`google_ads_user:${googleSub}`;externalName="Google Ads";metadata={...metadata,api_version:"v25",accessible_customer_ids:ads.ids,selected_customer_id:null,billing_mode:"provider_managed",billing_portal_url:"https://ads.google.com/"}
  }

  const mainId=await upsertConnection(svc,{organizationId:org,providerKey:provider,externalId,externalName,scopes:grantedScopes,expiresAt,metadata,createdBy:user.id});
  const secretIds=await storeTokens(svc,mainId,provider,String(token.access_token),token.refresh_token?String(token.refresh_token):undefined);
  if(provider==="google_workspace"&&!secretIds.refreshId)return json({error:"google_refresh_token_not_received",next_action:"reconnect_with_consent"},409,o);

  if(provider==="google_workspace"){
    if(grantedScopes.some((s:string)=>s.includes("youtube"))){
      const yt=await youtubeInfo(String(token.access_token));
      if(yt.ok&&yt.items.length){
        const first=yt.items[0];const id=await upsertConnection(svc,{organizationId:org,providerKey:"youtube",externalId:String(first.id),externalName:String(first?.snippet?.title||"YouTube"),scopes:grantedScopes,expiresAt,metadata:{credential_source_connection_id:mainId,shared_google_identity:true,channels:yt.items.map((x:any)=>({id:x.id,title:x?.snippet?.title||null})),selected_channel_id:first.id},createdBy:user.id});await linkTokens(svc,id,secretIds.accessId,secretIds.refreshId);linked.push({provider_key:"youtube",connection_id:id,status:"connected"})
      }
      discovery.youtube={available:yt.ok,count:yt.items.length}
    }
    if(grantedScopes.includes("https://www.googleapis.com/auth/business.manage")){
      const bp=await businessProfileInfo(String(token.access_token));
      if(bp.ok&&bp.accounts.length){
        const first=bp.accounts[0];const id=await upsertConnection(svc,{organizationId:org,providerKey:"google_business_profile",externalId:String(first.name),externalName:String(first.accountName||"Google Business Profile"),scopes:grantedScopes,expiresAt,metadata:{credential_source_connection_id:mainId,shared_google_identity:true,accounts:bp.accounts.map((x:any)=>({name:x.name,accountName:x.accountName||null,type:x.type||null})),selected_account:first.name},createdBy:user.id});await linkTokens(svc,id,secretIds.accessId,secretIds.refreshId);linked.push({provider_key:"google_business_profile",connection_id:id,status:"connected"})
      }
      discovery.google_business_profile={available:bp.ok,count:bp.accounts.length}
    }
    if(grantedScopes.includes("https://www.googleapis.com/auth/adwords")){
      const {data:devSetting}=await svc.from("internal_settings").select("secret_id").eq("setting_key","google_ads_developer_token").maybeSingle();
      if(devSetting?.secret_id){const {data:dev}=await svc.rpc("service_read_secret",{p_secret_id:devSetting.secret_id});if(dev){const ads=await adsInfo(String(token.access_token),String(dev));discovery.google_ads={available:ads.ok,count:ads.ids.length};if(ads.ok&&ads.ids.length){const id=await upsertConnection(svc,{organizationId:org,providerKey:"google_ads",externalId:`google_ads_user:${googleSub}`,externalName:"Google Ads",scopes:grantedScopes,expiresAt,metadata:{credential_source_connection_id:mainId,shared_google_identity:true,api_version:"v25",accessible_customer_ids:ads.ids,selected_customer_id:null,billing_mode:"provider_managed",billing_portal_url:"https://ads.google.com/"},createdBy:user.id});await linkTokens(svc,id,secretIds.accessId,secretIds.refreshId);linked.push({provider_key:"google_ads",connection_id:id,status:"connected"})}}}
      else discovery.google_ads={available:false,reason:"developer_token_not_configured"}
    }
    await svc.from("connections").update({metadata:{...metadata,linked_google_connections:linked,discovery}}).eq("id",mainId)
  }

  await svc.from("oauth_states").update({consumed_at:new Date().toISOString(),metadata:{...(a.metadata||{}),completed:true,google_account_sub:googleSub,linked_google_connections:linked}}).eq("id",attemptId);
  if(a.callback_code_secret_id)await svc.rpc("service_update_secret",{p_secret_id:a.callback_code_secret_id,p_secret:crypto.randomUUID()+crypto.randomUUID(),p_name:`cloudsales/oauth/${attemptId}/consumed`,p_description:"Consumed OAuth authorization code"});
  await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"connection.oauth.connected",entity_type:"connection",entity_id:mainId,connection_id:mainId,success:true,context:{provider_key:provider,google_unified:provider==="google_workspace",linked_connections:linked.map(x=>x.provider_key)}});
  return json({connection:{id:mainId,provider_key:provider,status:"connected",external_account_id:externalId,external_account_name:externalName,expires_at:expiresAt,scopes:grantedScopes},linked_connections:linked,discovery},200,o)
}

Deno.serve(async req=>{
  const o=req.headers.get("origin");if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(o)});if(req.method!=="POST")return json({error:"method_not_allowed"},405,o);if(o&&!ORIGINS.has(o))return json({error:"origin_not_allowed"},403,o);
  const auth=req.headers.get("authorization");if(!auth)return json({error:"missing_authorization"},401,o);
  const uc=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});const {data:ud}=await uc.auth.getUser();const user=ud.user;if(!user)return json({error:"invalid_session"},401,o);
  let b:any;try{b=await req.json()}catch{return json({error:"invalid_json"},400,o)}
  const org=String(b.organization_id||""),provider=String(b.provider_key||""),attemptId=String(b.oauth_attempt_id||""),state=String(b.state||"");if(!org||!provider||!attemptId||!state)return json({error:"missing_required_fields"},400,o);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});const {data:m}=await svc.from("organization_members").select("role,status").eq("organization_id",org).eq("user_id",user.id).maybeSingle();if(!m||m.status!=="active"||!["owner","admin"].includes(String(m.role)))return json({error:"forbidden"},403,o);
  const stateHash=await sha(state);const {data:a}=await svc.from("oauth_states").select("id,state_hash,organization_id,provider_key,user_id,redirect_to,expires_at,consumed_at,callback_code_secret_id,callback_error,metadata").eq("id",attemptId).eq("organization_id",org).eq("provider_key",provider).eq("user_id",user.id).maybeSingle();if(!a||a.state_hash!==stateHash||a.consumed_at||new Date(a.expires_at).getTime()<=Date.now())return json({error:"invalid_oauth_attempt"},400,o);if(a.callback_error)return json({error:"provider_callback_error",detail:a.callback_error},422,o);
  let code=String(b.code||"").trim();if(!code&&a.callback_code_secret_id){const {data}=await svc.rpc("service_read_secret",{p_secret_id:a.callback_code_secret_id});if(data)code=String(data)}if(!code)return json({error:"oauth_code_not_received"},409,o);

  if(GOOGLE_PROVIDERS.has(provider))return await completeGoogle({svc,org,provider,attemptId,attempt:a,code,user,origin:o});

  const target=provider==="highlevel"?"connect-highlevel":"connection-complete-v3";
  const payload=provider==="highlevel"?{organization_id:org,oauth_attempt_id:attemptId,code,redirect_uri:a.redirect_to||b.redirect_uri||null,user_type:b.user_type||"Location"}:{...b,organization_id:org,provider_key:provider,oauth_attempt_id:attemptId,state,code};
  const r=await fetch(`${U}/functions/v1/${target}`,{method:"POST",headers:{Authorization:auth,apikey:A,"content-type":"application/json",...(o?{origin:o}:{})},body:JSON.stringify(payload)});const txt=await r.text();
  if(r.ok&&a.callback_code_secret_id)await svc.rpc("service_update_secret",{p_secret_id:a.callback_code_secret_id,p_secret:crypto.randomUUID()+crypto.randomUUID(),p_name:`cloudsales/oauth/${attemptId}/consumed`,p_description:"Consumed OAuth authorization code"});
  if(r.ok)await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"connection.oauth.completed.v4",entity_type:"oauth_state",entity_id:attemptId,success:true,context:{provider_key:provider,handler:target}});
  return new Response(txt,{status:r.status,headers:{...cors(o),"content-type":"application/json;charset=utf-8","cache-control":"no-store"}})
});
