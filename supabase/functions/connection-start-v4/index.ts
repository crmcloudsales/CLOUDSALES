import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!,A=Deno.env.get("SUPABASE_ANON_KEY")!,S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGINS=new Set(["https://cloudsales.app","https://www.cloudsales.app","https://app.cloudsales.app","http://localhost:3000","http://localhost:5173"]);
const GOOGLE_DIRECT=new Set(["google_workspace","google_ads","youtube","google_business_profile"]);
const GOOGLE_WORKSPACE_FALLBACK=[
  "openid","email","profile",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/business.manage",
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/tagmanager.readonly",
  "https://www.googleapis.com/auth/content",
  "https://www.googleapis.com/auth/photospicker.mediaitems.readonly"
];
const GOOGLE_SCOPE_GROUPS={
  identity:["openid","email","profile"],
  drive:["https://www.googleapis.com/auth/drive.readonly"],
  gmail:["https://www.googleapis.com/auth/gmail.readonly"],
  calendar:["https://www.googleapis.com/auth/calendar.readonly","https://www.googleapis.com/auth/calendar.events"],
  contacts:["https://www.googleapis.com/auth/contacts.readonly"],
  tasks:["https://www.googleapis.com/auth/tasks"],
  youtube:["https://www.googleapis.com/auth/youtube.readonly","https://www.googleapis.com/auth/youtube.upload","https://www.googleapis.com/auth/youtube.force-ssl"],
  business_profile:["https://www.googleapis.com/auth/business.manage"],
  google_ads:["https://www.googleapis.com/auth/adwords"],
  analytics:["https://www.googleapis.com/auth/analytics.readonly"],
  search_console:["https://www.googleapis.com/auth/webmasters.readonly"],
  tag_manager:["https://www.googleapis.com/auth/tagmanager.readonly"],
  merchant:["https://www.googleapis.com/auth/content"],
  photos:["https://www.googleapis.com/auth/photospicker.mediaitems.readonly"]
};

function cors(o:string|null){const v=o&&ORIGINS.has(o)?o:"https://app.cloudsales.app";return{"Access-Control-Allow-Origin":v,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}}
function json(b:unknown,s=200,o:string|null=null){return new Response(JSON.stringify(b),{status:s,headers:{...cors(o),"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}})}
async function shaHex(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function randomUrl(n=40){const b=new Uint8Array(n);crypto.getRandomValues(b);let s="";for(const x of b)s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
function unique(values:string[]){return [...new Set(values.map(String).map(x=>x.trim()).filter(Boolean))]}

async function ensureGoogleCredentials(svc:any){
  const clientId=String(Deno.env.get("cloudsales/google/oauth/client-id")||Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")||"").trim();
  const clientSecret=String(Deno.env.get("cloudsales/google/oauth/client-secret")||Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")||"").trim();
  if(!clientId||!clientSecret)return {ready:false,source:"edge_function_secrets_missing"};
  const redirectUri=`${U}/functions/v1/oauth-callback-relay`;

  const {data:setting}=await svc.from("internal_settings").select("secret_id").eq("setting_key","google_oauth_client_secret_cloudsales").maybeSingle();
  let secretId=setting?.secret_id||null;
  if(secretId){
    const {error}=await svc.rpc("service_update_secret",{p_secret_id:secretId,p_secret:clientSecret,p_name:"cloudsales/google/oauth/client-secret",p_description:"CloudSales Google OAuth client secret synced from Edge Function Secrets"});
    if(error)throw error;
  }else{
    const {data,error}=await svc.rpc("service_store_secret",{p_secret:clientSecret,p_name:"cloudsales/google/oauth/client-secret",p_description:"CloudSales Google OAuth client secret synced from Edge Function Secrets"});
    if(error||!data)throw error||new Error("google_secret_store_failed");
    secretId=data;
  }
  await svc.from("internal_settings").upsert({setting_key:"google_oauth_client_secret_cloudsales",secret_id:secretId,value:{configured:true,source:"edge_function_secrets",updated_at:new Date().toISOString()}},{onConflict:"setting_key"});
  await svc.from("internal_settings").upsert({setting_key:"google_oauth_client_id_cloudsales",secret_id:null,value:{client_id:clientId,configured:true,source:"edge_function_secrets",updated_at:new Date().toISOString()}},{onConflict:"setting_key"});

  const providerScopes:Record<string,string[]>={
    google_workspace:GOOGLE_WORKSPACE_FALLBACK,
    youtube:["openid","email","profile",...GOOGLE_SCOPE_GROUPS.youtube],
    google_business_profile:["openid","email","profile",...GOOGLE_SCOPE_GROUPS.business_profile],
    google_ads:["openid","email","profile",...GOOGLE_SCOPE_GROUPS.google_ads]
  };
  for(const providerKey of Object.keys(providerScopes)){
    const {data:old}=await svc.from("provider_app_credentials").select("metadata").eq("provider_key",providerKey).maybeSingle();
    const metadata:any={...(old?.metadata||{}),scopes:providerScopes[providerKey],shared_google_oauth_client:true,credential_source:"edge_function_secrets",google_cloud_project_id:"cloudsales-507715",google_cloud_project_number:"1039655793672",configured_at:new Date().toISOString()};
    if(providerKey==="google_workspace")metadata.scope_groups=GOOGLE_SCOPE_GROUPS;
    const {error}=await svc.from("provider_app_credentials").upsert({provider_key:providerKey,client_id:clientId,client_secret_secret_id:secretId,redirect_uri:redirectUri,enabled:true,metadata},{onConflict:"provider_key"});
    if(error)throw error;
  }
  await svc.from("provider_catalog").update({availability:"beta",updated_at:new Date().toISOString()}).eq("provider_key","google_workspace");
  return {ready:true,source:"edge_function_secrets"};
}

Deno.serve(async req=>{
  const o=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(o)});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405,o);
  if(o&&!ORIGINS.has(o))return json({error:"origin_not_allowed"},403,o);
  const auth=req.headers.get("authorization");
  if(!auth)return json({error:"missing_authorization"},401,o);

  let b:any={};
  try{b=await req.json()}catch{return json({error:"invalid_json"},400,o)}
  const org=String(b.organization_id||""),provider=String(b.provider_key||b.provider||"");
  if(!org||!provider)return json({error:"organization_id_and_provider_required"},400,o);

  const uc=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud}=await uc.auth.getUser();const user=ud.user;
  if(!user)return json({error:"invalid_session"},401,o);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:m}=await svc.from("organization_members").select("role,status").eq("organization_id",org).eq("user_id",user.id).maybeSingle();
  if(!m||m.status!=="active"||!["owner","admin"].includes(String(m.role)))return json({error:"forbidden"},403,o);

  const [{data:legal},{data:authorized}]=await Promise.all([
    svc.rpc("has_required_cloudsales_legal_acceptance",{p_user_id:user.id,p_organization_id:org}),
    svc.rpc("has_provider_authorization",{p_user_id:user.id,p_organization_id:org,p_provider_key:provider})
  ]);
  if(legal!==true)return json({error:"legal_acceptance_required",next_action:"accept_required_terms"},409,o);
  if(authorized!==true)return json({error:"provider_authorization_required",provider_key:provider,next_action:"authorize_provider"},409,o);

  if(!GOOGLE_DIRECT.has(provider)){
    const r=await fetch(`${U}/functions/v1/connection-start-v3`,{method:"POST",headers:{authorization:auth,apikey:A,"content-type":"application/json",...(o?{origin:o}:{})},body:JSON.stringify({...b,organization_id:org,provider_key:provider})});
    const t=await r.text();let d:any;try{d=JSON.parse(t)}catch{return json({error:"connection_start_bad_response"},502,o)}return json(d,r.status,o)
  }

  try{await ensureGoogleCredentials(svc)}catch{
    return json({error:"google_platform_secret_sync_failed"},503,o)
  }

  const [{data:p},{data:cred}]=await Promise.all([
    svc.from("provider_catalog").select("provider_key,display_name,availability,metadata").eq("provider_key",provider).maybeSingle(),
    svc.from("provider_app_credentials").select("client_id,client_secret_secret_id,redirect_uri,enabled,metadata").eq("provider_key",provider).maybeSingle()
  ]);
  const appReady=Boolean(cred?.enabled&&cred.client_id&&cred.client_secret_secret_id&&cred.redirect_uri);
  let devReady=true;
  if(provider==="google_ads"){
    const {data:dev}=await svc.from("internal_settings").select("secret_id").eq("setting_key","google_ads_developer_token").maybeSingle();
    devReady=Boolean(dev?.secret_id)
  }

  const configuredScopes=Array.isArray(cred?.metadata?.scopes)?cred.metadata.scopes.map(String).filter(Boolean):[];
  const fallbackScopes:Record<string,string[]>={
    google_workspace:GOOGLE_WORKSPACE_FALLBACK,
    google_ads:["openid","email","profile","https://www.googleapis.com/auth/adwords"],
    youtube:["openid","email","profile","https://www.googleapis.com/auth/youtube.upload","https://www.googleapis.com/auth/youtube.readonly","https://www.googleapis.com/auth/youtube.force-ssl"],
    google_business_profile:["openid","email","profile","https://www.googleapis.com/auth/business.manage"]
  };

  let scopes=configuredScopes.length?configuredScopes:(fallbackScopes[provider]||[]);
  const requestedCapabilities=Array.isArray(b.capabilities)?b.capabilities.map(String).filter(Boolean):[];
  const scopeGroups=cred?.metadata?.scope_groups&&typeof cred.metadata.scope_groups==="object"?cred.metadata.scope_groups:null;
  if(provider==="google_workspace"&&requestedCapabilities.length&&scopeGroups){
    const selected:string[]=[];
    for(const key of ["identity",...requestedCapabilities]){
      const group=(scopeGroups as any)[key];
      if(Array.isArray(group))selected.push(...group.map(String));
    }
    if(selected.length)scopes=unique(selected)
  }
  scopes=unique(scopes);

  if(!appReady||!devReady||!scopes.length)return json({error:`${provider}_platform_not_configured`,provider_key:provider,setup_required:{oauth_client:!appReady,developer_token:provider==="google_ads"&&!devReady,redirect_uri_expected:`${U}/functions/v1/oauth-callback-relay`,scopes}},503,o);
  if(!cred)return json({error:`${provider}_platform_not_configured`,provider_key:provider},503,o);
  if(p?.availability==="disabled")return json({error:"provider_not_available"},404,o);

  const state=randomUrl(),stateHash=await shaHex(state),expires=new Date(Date.now()+15*60*1000).toISOString(),scope=scopes.join(" ");
  const {data:attempt,error}=await svc.from("oauth_states").insert({
    state_hash:stateHash,organization_id:org,provider_key:provider,user_id:user.id,redirect_to:cred.redirect_uri,expires_at:expires,
    metadata:{oauth_flow:"multi_user",scope,scopes,capabilities:requestedCapabilities,access_type:"offline",include_granted_scopes:true,google_unified:provider==="google_workspace"}
  }).select("id").single();
  if(error||!attempt)return json({error:"oauth_attempt_create_failed"},500,o);

  const q=new URLSearchParams({client_id:String(cred.client_id),redirect_uri:String(cred.redirect_uri),response_type:"code",scope,access_type:"offline",include_granted_scopes:"true",prompt:"consent",state});
  const url=`https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"connection.oauth.started",entity_type:"oauth_state",entity_id:attempt.id,success:true,context:{provider_key:provider,scopes,capabilities:requestedCapabilities,credential_source:"edge_function_secrets"}});
  return json({provider_key:provider,display_name:p?.display_name||provider,authorization_url:url,oauth_attempt_id:attempt.id,state,expires_at:expires,redirect_uri:cred.redirect_uri,callback_method:"GET",scopes,capabilities:requestedCapabilities},200,o)
});
