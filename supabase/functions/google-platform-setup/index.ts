import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!,S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RELAY=`${U}/functions/v1/oauth-callback-relay`;
const PURPOSE="cloudsales_google_platform_setup";
const PROJECT_ID="cloudsales-507715";
const PROJECT_NUMBER="1039655793672";
const te=new TextEncoder();

const headers={
  "content-type":"text/html; charset=utf-8",
  "cache-control":"no-store, max-age=0",
  "pragma":"no-cache",
  "x-content-type-options":"nosniff",
  "x-frame-options":"DENY",
  "referrer-policy":"no-referrer",
  "cross-origin-opener-policy":"same-origin",
  "content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
};

const IDENTITY=["openid","email","profile"];
const SCOPE_GROUPS:Record<string,string[]>={
  identity:IDENTITY,
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
const ALL_SCOPES=[...new Set(Object.values(SCOPE_GROUPS).flat())];

async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",te.encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function esc(v:string){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c))}
function page(token:string,msg="",ok=false,configured=false){return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CloudSales · Google Setup</title><style>
body{margin:0;background:#08070D;color:#f5f5fb;font:16px system-ui;padding:20px}.wrap{max-width:720px;margin:auto}.card{background:#11111d;border:1px solid #2c2140;border-radius:24px;padding:24px}h1{margin:4px 0 8px;font-size:27px}.brand{font-weight:900;color:#F955B6}.sub,small{color:#aaaabd;line-height:1.55}.status{display:inline-block;border:1px solid ${configured?'#2d6744':'#67512d'};color:${configured?'#8ef0b7':'#e7c17d'};padding:5px 9px;border-radius:999px;font-size:12px}.msg{margin:16px 0;padding:12px;border-radius:12px;background:${ok?'#10351f':'#4a1724'}}label{display:block;color:#d0cfda;font-size:13px;margin:15px 0 6px}input{width:100%;box-sizing:border-box;background:#090912;color:#fff;border:1px solid #38334b;border-radius:12px;padding:13px;font-size:15px}.relay{font:12px ui-monospace,monospace;background:#090912;border:1px solid #30283d;border-radius:10px;padding:10px;overflow-wrap:anywhere;color:#e3dfea}.box{margin-top:18px;padding:14px;border:1px solid #30283d;border-radius:14px;background:#0c0b13}.warning{color:#e9c38c;font-size:12px;line-height:1.5}button{width:100%;margin-top:20px;padding:14px;border:0;border-radius:999px;background:#F955B6;color:#fff;font-size:16px;font-weight:900}</style></head><body><div class="wrap"><div class="card"><div class="brand">CloudSales</div><h1>Google Platform · configuración segura</h1><span class="status">${configured?'Configurado':'Pendiente'}</span><p class="sub">Un solo OAuth Web Client para Google Drive, Gmail, Calendar, Contacts, Tasks, YouTube, Business Profile, Google Ads, Analytics, Search Console, Tag Manager, Merchant y Photos. El Client Secret va directo a Vault y nunca se vuelve a mostrar.</p>${msg?`<div class="msg">${esc(msg)}</div>`:''}<div class="box"><small><b>Google Cloud project</b><br>${PROJECT_ID} · ${PROJECT_NUMBER}<br><br><b>Authorized redirect URI</b></small><div class="relay">${esc(RELAY)}</div></div>${ok?'':`<form method="post"><input type="hidden" name="setup_token" value="${esc(token)}"><label>Google OAuth Client ID</label><input name="client_id" autocomplete="off" placeholder="123…apps.googleusercontent.com" required><label>Google OAuth Client Secret</label><input name="client_secret" type="password" autocomplete="new-password" required><label>Google Ads Developer Token <small>(opcional por ahora)</small></label><input name="developer_token" type="password" autocomplete="new-password" placeholder="Déjalo vacío si aún no lo tienes"><div class="box warning">No pegues estas credenciales en chats, GitHub, Drive ni documentos. Esta página las envía únicamente al backend de CloudSales y las guarda en Vault.</div><button type="submit">Guardar Google de forma segura</button></form>`}</div></div></body></html>`}

async function validToken(svc:any,token:string){if(!token)return false;const h=await sha(token);const {data}=await svc.from("admin_setup_tokens").select("purpose,expires_at,revoked_at").eq("token_hash",h).maybeSingle();return Boolean(data&&data.purpose===PURPOSE&&!data.revoked_at&&new Date(data.expires_at).getTime()>Date.now())}
async function configured(svc:any){const {data}=await svc.from("provider_app_credentials").select("provider_key,client_id,client_secret_secret_id,enabled").eq("provider_key","google_workspace").maybeSingle();return Boolean(data?.enabled&&data?.client_id&&data?.client_secret_secret_id)}
async function storeSecret(svc:any,key:string,value:string,name:string,description:string){const {data:old}=await svc.from("internal_settings").select("secret_id").eq("setting_key",key).maybeSingle();let id=old?.secret_id;if(id){const {error}=await svc.rpc("service_update_secret",{p_secret_id:id,p_secret:value,p_name:name,p_description:description});if(error)throw error}else{const {data,error}=await svc.rpc("service_store_secret",{p_secret:value,p_name:name,p_description:description});if(error||!data)throw error||new Error("secret_storage_failed");id=data}await svc.from("internal_settings").upsert({setting_key:key,secret_id:id,value:{configured:true,updated_at:new Date().toISOString()}},{onConflict:"setting_key"});return String(id)}
async function upsertProvider(svc:any,providerKey:string,clientId:string,secretId:string,scopes:string[],extra:any={}){const {data:old}=await svc.from("provider_app_credentials").select("metadata").eq("provider_key",providerKey).maybeSingle();const {error}=await svc.from("provider_app_credentials").upsert({provider_key:providerKey,client_id:clientId,client_secret_secret_id:secretId,redirect_uri:RELAY,enabled:true,metadata:{...(old?.metadata||{}),scopes,shared_google_oauth_client:true,google_cloud_project_id:PROJECT_ID,google_cloud_project_number:PROJECT_NUMBER,...extra,configured_via:"google_platform_setup",configured_at:new Date().toISOString()}},{onConflict:"provider_key"});if(error)throw error}

Deno.serve(async req=>{
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}}),url=new URL(req.url);
  if(req.method==="GET"){
    const token=url.searchParams.get("token")||"";if(!(await validToken(svc,token)))return new Response(page("","Este enlace es inválido o expiró."),{status:403,headers});return new Response(page(token,"",false,await configured(svc)),{headers})
  }
  if(req.method!=="POST")return new Response("Method not allowed",{status:405,headers});
  const form=await req.formData(),token=String(form.get("setup_token")||"");if(!(await validToken(svc,token)))return new Response(page("","Este enlace es inválido o expiró."),{status:403,headers});
  try{
    const clientId=String(form.get("client_id")||"").trim(),clientSecret=String(form.get("client_secret")||"").trim(),developerToken=String(form.get("developer_token")||"").trim();
    if(!/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId))throw new Error("El Google OAuth Client ID no tiene un formato válido.");
    if(clientSecret.length<12||/\s/.test(clientSecret))throw new Error("El Google OAuth Client Secret no tiene un formato válido.");
    const secretId=await storeSecret(svc,"google_oauth_client_secret_cloudsales",clientSecret,"cloudsales/google/oauth/client-secret","CloudSales Google OAuth Web Client secret");
    await svc.from("internal_settings").upsert({setting_key:"google_oauth_client_id_cloudsales",secret_id:null,value:{client_id:clientId,configured:true,updated_at:new Date().toISOString()}},{onConflict:"setting_key"});

    await upsertProvider(svc,"google_workspace",clientId,secretId,ALL_SCOPES,{scope_groups:SCOPE_GROUPS,default_capabilities:Object.keys(SCOPE_GROUPS).filter(x=>x!=="identity"),unified_oauth:true});
    await upsertProvider(svc,"youtube",clientId,secretId,[...IDENTITY,...SCOPE_GROUPS.youtube],{credential_source:"google_workspace"});
    await upsertProvider(svc,"google_business_profile",clientId,secretId,[...IDENTITY,...SCOPE_GROUPS.business_profile],{credential_source:"google_workspace"});
    await upsertProvider(svc,"google_ads",clientId,secretId,[...IDENTITY,...SCOPE_GROUPS.google_ads],{credential_source:"google_workspace",api_version:"v25"});

    if(developerToken){if(developerToken.length<8||/\s/.test(developerToken))throw new Error("El Google Ads Developer Token no tiene un formato válido.");await storeSecret(svc,"google_ads_developer_token",developerToken,"cloudsales/google-ads/developer-token","CloudSales Google Ads developer token")}

    const {data:catalog}=await svc.from("provider_catalog").select("metadata").eq("provider_key","google_workspace").maybeSingle();
    await svc.from("provider_catalog").update({availability:"beta",metadata:{...(catalog?.metadata||{}),google_cloud_project_id:PROJECT_ID,google_cloud_project_number:PROJECT_NUMBER,provider_type:"unified_google_platform",unified_oauth:true,integration_status:"oauth_client_configured",capability_domains:Object.keys(SCOPE_GROUPS).filter(x=>x!=="identity"),redirect_uri:RELAY},updated_at:new Date().toISOString()}).eq("provider_key","google_workspace");
    await svc.from("admin_setup_tokens").update({revoked_at:new Date().toISOString(),last_used_at:new Date().toISOString(),use_count:1}).eq("token_hash",await sha(token));
    await svc.from("audit_log").insert({actor_type:"system",action:"google.platform.credentials.configured",entity_type:"provider_app_credentials",entity_id:"google_workspace",success:true,context:{google_cloud_project_id:PROJECT_ID,shared_oauth_client:true,providers:["google_workspace","youtube","google_business_profile","google_ads"],developer_token_configured:Boolean(developerToken)}});
    return new Response(page("","Google quedó guardado en Vault. El Client Secret no se mostrará de nuevo.",true,true),{headers})
  }catch(e){return new Response(page(token,String((e as Error).message||"No se pudo guardar Google."),false,await configured(svc)),{status:400,headers})}
});
