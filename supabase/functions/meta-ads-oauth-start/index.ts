import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!;
const A=Deno.env.get("SUPABASE_ANON_KEY")!;
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PROVIDER="meta_ads";
const DEFAULT_VERSION="v24.0";
const DEFAULT_SCOPES=["ads_read","ads_management"];
const ORIGINS=new Set(["https://cloudsales.app","https://www.cloudsales.app","https://app.cloudsales.app","http://localhost:3000","http://localhost:5173"]);
function cors(o:string|null){const v=o&&ORIGINS.has(o)?o:"https://app.cloudsales.app";return{"Access-Control-Allow-Origin":v,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}}
function json(b:unknown,s=200,o:string|null=null){return new Response(JSON.stringify(b),{status:s,headers:{...cors(o),"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}})}
async function shaHex(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function randomUrl(n=40){const b=new Uint8Array(n);crypto.getRandomValues(b);let s="";for(const x of b)s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}

Deno.serve(async req=>{
  const o=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(o)});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405,o);
  if(o&&!ORIGINS.has(o))return json({error:"origin_not_allowed"},403,o);
  const auth=req.headers.get("authorization");if(!auth)return json({error:"missing_authorization"},401,o);
  const uc=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const{data:ud}=await uc.auth.getUser();const user=ud.user;if(!user)return json({error:"invalid_session"},401,o);
  let b:any={};try{b=await req.json()}catch{return json({error:"invalid_json"},400,o)}
  const org=String(b.organization_id||"");if(!org)return json({error:"organization_id_required"},400,o);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const{data:m}=await svc.from("organization_members").select("role,status").eq("organization_id",org).eq("user_id",user.id).maybeSingle();
  if(!m||m.status!=="active"||!["owner","admin"].includes(String(m.role)))return json({error:"forbidden"},403,o);
  const[{data:legal},{data:authorized},{data:p},{data:cred}]=await Promise.all([
    svc.rpc("has_required_cloudsales_legal_acceptance",{p_user_id:user.id,p_organization_id:org}),
    svc.rpc("has_provider_authorization",{p_user_id:user.id,p_organization_id:org,p_provider_key:PROVIDER}),
    svc.from("provider_catalog").select("provider_key,display_name,availability,metadata").eq("provider_key",PROVIDER).maybeSingle(),
    svc.from("provider_app_credentials").select("client_id,client_secret_secret_id,redirect_uri,enabled,metadata").eq("provider_key",PROVIDER).maybeSingle(),
  ]);
  if(legal!==true)return json({error:"legal_acceptance_required",next_action:"accept_required_terms"},409,o);
  if(authorized!==true)return json({error:"provider_authorization_required",provider_key:PROVIDER,next_action:"authorize_provider"},409,o);
  if(!p||p.availability==="disabled")return json({error:"provider_not_available"},404,o);
  const appReady=Boolean(cred?.enabled&&cred.client_id&&cred.client_secret_secret_id&&cred.redirect_uri);
  if(!appReady)return json({error:"meta_ads_platform_not_configured",provider_key:PROVIDER,setup_required:{oauth_app:true,redirect_uri_expected:`${U}/functions/v1/oauth-callback-relay`,required_permissions:DEFAULT_SCOPES}},503,o);
  const version=String(cred?.metadata?.graph_api_version||p.metadata?.graph_api_version||DEFAULT_VERSION);
  const scopes=(Array.isArray(cred?.metadata?.scopes)&&cred.metadata.scopes.length?cred.metadata.scopes:Array.isArray(p.metadata?.oauth_scopes)&&p.metadata.oauth_scopes.length?p.metadata.oauth_scopes:DEFAULT_SCOPES).map(String);
  const state=randomUrl(),stateHash=await shaHex(state),expires=new Date(Date.now()+15*60*1000).toISOString();
  const{data:attempt,error}=await svc.from("oauth_states").insert({state_hash:stateHash,organization_id:org,provider_key:PROVIDER,user_id:user.id,redirect_to:cred.redirect_uri,expires_at:expires,metadata:{oauth_flow:"meta_ads_management",graph_api_version:version,scopes}}).select("id").single();
  if(error||!attempt)return json({error:"oauth_attempt_create_failed"},500,o);
  const q=new URLSearchParams({client_id:String(cred.client_id),redirect_uri:String(cred.redirect_uri),state,response_type:"code",scope:scopes.join(",")});
  const url=`https://www.facebook.com/${version}/dialog/oauth?${q}`;
  await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action:"connection.oauth.started",entity_type:"oauth_state",entity_id:attempt.id,success:true,context:{provider_key:PROVIDER,graph_api_version:version,scopes}});
  return json({provider_key:PROVIDER,display_name:p.display_name||"Meta Ads",authorization_url:url,oauth_attempt_id:attempt.id,state,expires_at:expires,redirect_uri:cred.redirect_uri,callback_method:"GET",required_permissions:scopes},200,o);
});
