import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OAUTH_RELAY=`${SUPABASE_URL}/functions/v1/oauth-callback-relay`;
const PURPOSE="cloudsales_platform_integrations";
const te=new TextEncoder();
const htmlHeaders={
  "content-type":"text/html; charset=utf-8",
  "cache-control":"no-store, max-age=0",
  "pragma":"no-cache",
  "x-content-type-options":"nosniff",
  "x-frame-options":"DENY",
  "referrer-policy":"no-referrer",
  "cross-origin-opener-policy":"same-origin",
  "content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"}});

type SetupStatus={stripe:boolean;stripe_prices:boolean;cloudflare:boolean;highlevel:boolean;google_ads:boolean;google_developer_token:boolean;meta_ads:boolean};
const EMPTY_STATUS:SetupStatus={stripe:false,stripe_prices:false,cloudflare:false,highlevel:false,google_ads:false,google_developer_token:false,meta_ads:false};
const ALLOWED_PURPOSES=new Set([PURPOSE,"cloudsales_initial_setup"]);

async function sha(value:string){const digest=await crypto.subtle.digest("SHA-256",te.encode(value));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function same(a:string,b:string){if(!a||!b)return false;const[x,y]=await Promise.all([sha(a),sha(b)]);if(x.length!==y.length)return false;let r=0;for(let i=0;i<x.length;i++)r|=x.charCodeAt(i)^y.charCodeAt(i);return r===0}
function randomToken(bytes=36){const b=new Uint8Array(bytes);crypto.getRandomValues(b);let s="";for(const x of b)s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
function esc(value:string){return String(value??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]||c))}
function badge(ok:boolean){return `<span class="badge ${ok?'ok':'todo'}">${ok?'Configured':'Not configured'}</span>`}
function page(token:string,status:SetupStatus,message="",ok=false){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CloudSales Secure Setup</title><style>
body{margin:0;background:#080811;color:#f5f5fb;font:16px system-ui;padding:24px}.wrap{max-width:760px;margin:auto}.card{background:#11111d;border:1px solid #29293a;border-radius:24px;padding:24px}h1{margin:0 0 8px;font-size:28px}.sub{color:#aaaabd;margin:0 0 24px;line-height:1.55}.g{display:grid;gap:14px}.section{border-top:1px solid #29293a;padding-top:18px;margin-top:8px}.title{display:flex;justify-content:space-between;gap:12px;align-items:center}.title h3{margin:0 0 12px}.badge{font-size:11px;border-radius:999px;padding:5px 8px;border:1px solid #4a4a5d}.badge.ok{color:#8ef0b7;border-color:#2d6744}.badge.todo{color:#e7c17d;border-color:#67512d}label{display:block;font-size:13px;color:#c8c8d4;margin:10px 0 6px}input{width:100%;box-sizing:border-box;background:#090912;color:#fff;border:1px solid #33334a;border-radius:12px;padding:13px;font-size:15px}button{margin-top:20px;width:100%;padding:14px;border:0;border-radius:999px;background:#ff2b9b;color:#fff;font-weight:800;font-size:16px}.msg{padding:12px;border-radius:12px;margin-bottom:16px;background:${ok?'#10351f':'#4a1724'}}small{color:#858596;line-height:1.5}.brand{color:#ff2b9b;font-weight:800}.relay{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;background:#090912;border:1px solid #2f2f40;border-radius:10px;padding:10px;overflow-wrap:anywhere;color:#d6d4df}.warning{border:1px solid #5b4129;background:#241a10;border-radius:12px;padding:11px;color:#e9c38c;font-size:12px;line-height:1.5;margin-top:12px}.okbox{border:1px solid #285a3c;background:#0d2d1a;border-radius:12px;padding:11px;color:#9de6b7;font-size:12px;line-height:1.5;margin-top:12px}
</style></head><body><div class="wrap"><div class="card"><div class="brand">CloudSales</div><h1>Secure integration setup</h1><p class="sub">Platform credentials go directly from this browser to CloudSales Vault. Secret values are never shown back after saving and should never be pasted into chat. Leave a complete integration section blank if it is not ready yet.</p>${message?`<div class="msg">${esc(message)}</div>`:''}<form method="post"><input type="hidden" name="setup_token" value="${esc(token)}"><div class="g">
<div class="section"><div class="title"><h3>Stripe — dedicated CloudSales billing</h3>${badge(status.stripe&&status.stripe_prices)}</div><small>Use only credentials from the dedicated CloudSales Stripe account. LISTIA or any shared account credentials are not accepted as CloudSales billing configuration.</small><label>CloudSales live secret key</label><input name="stripe_secret" type="password" autocomplete="new-password" placeholder="sk_live_…"><label>CloudSales live publishable key</label><input name="stripe_publishable" autocomplete="off" placeholder="pk_live_…">${status.stripe&&!status.stripe_prices?'<div class="warning">Dedicated keys are stored, but checkout remains disabled until CloudSales products/prices are migrated into this same Stripe account.</div>':''}${status.stripe&&status.stripe_prices?'<div class="okbox">Dedicated account and CloudSales prices are ready.</div>':''}</div>
<div class="section"><div class="title"><h3>Cloudflare</h3>${badge(status.cloudflare)}</div><label>Cloudflare API Token</label><input name="cloudflare_token" type="password" autocomplete="new-password" placeholder="API token for CloudSales zone"></div>
<div class="section"><div class="title"><h3>HighLevel</h3>${badge(status.highlevel)}</div><label>Client ID</label><input name="highlevel_client_id" autocomplete="off"><label>Client Secret</label><input name="highlevel_client_secret" type="password" autocomplete="new-password"><label>Installation URL</label><input name="highlevel_install_url" type="url" placeholder="https://…"><label>Redirect URI</label><input name="highlevel_redirect_uri" type="url" value="https://app.cloudsales.app/?oauth=highlevel"></div>
<div class="section"><div class="title"><h3>Google Ads — CloudSales platform OAuth</h3>${badge(status.google_ads&&status.google_developer_token)}</div><small>These are CloudSales platform credentials, not a client's Google login. Configure this exact redirect URI in Google Cloud:</small><div class="relay">${esc(OAUTH_RELAY)}</div><label>OAuth Client ID</label><input name="google_ads_client_id" autocomplete="off" placeholder="…apps.googleusercontent.com"><label>OAuth Client Secret</label><input name="google_ads_client_secret" type="password" autocomplete="new-password"><label>Google Ads Developer Token</label><input name="google_ads_developer_token" type="password" autocomplete="new-password"><div class="warning">CloudSales requests only the Google Ads OAuth scope. Client advertising spend and payment methods remain with Google.</div></div>
<div class="section"><div class="title"><h3>Meta Ads — CloudSales platform OAuth</h3>${badge(status.meta_ads)}</div><small>These are the CloudSales Meta App credentials, separate from every client's Dataset/CAPI token. Configure this exact redirect URI in the Meta App:</small><div class="relay">${esc(OAUTH_RELAY)}</div><label>Meta App ID</label><input name="meta_ads_app_id" inputmode="numeric" autocomplete="off"><label>Meta App Secret</label><input name="meta_ads_app_secret" type="password" autocomplete="new-password"><div class="warning">CloudSales requests <b>ads_read</b> and <b>ads_management</b>. Dataset/CAPI credentials remain isolated under the separate Meta signals connection.</div></div>
</div><button type="submit">Save securely to Vault</button><p><small>This setup link expires automatically. Secret fields are never repopulated. CloudSales does not collect advertising card numbers, security codes, or expiration dates.</small></p></form></div></div></body></html>`}

async function validToken(svc:any,token:string){if(!token)return false;const hash=await sha(token);const {data}=await svc.from("admin_setup_tokens").select("purpose,expires_at,revoked_at").eq("token_hash",hash).maybeSingle();return Boolean(data&&ALLOWED_PURPOSES.has(String(data.purpose))&&!data.revoked_at&&new Date(data.expires_at).getTime()>Date.now())}
async function status(svc:any):Promise<SetupStatus>{
  const [{data:settings},{data:providers},{data:items}]=await Promise.all([
    svc.from("internal_settings").select("setting_key,secret_id,value").in("setting_key",["stripe_secret_key_cloudsales","stripe_publishable_key_cloudsales","cloudflare_api_token_cloudsales","google_ads_developer_token"]),
    svc.from("provider_app_credentials").select("provider_key,client_id,client_secret_secret_id,enabled").in("provider_key",["highlevel","google_ads","meta_ads"]),
    svc.from("billable_items").select("item_key,stripe_price_id,metadata").eq("brand_key","cloudsales").eq("category","subscription").eq("active",true),
  ]);
  const sm=new Map((settings||[]).map((x:any)=>[String(x.setting_key),x]));
  const pm=new Map((providers||[]).map((x:any)=>[String(x.provider_key),x]));
  const ready=(key:string)=>{const x:any=pm.get(key);return Boolean(x?.enabled&&x?.client_id&&x?.client_secret_secret_id)};
  const stripeSecret=Boolean((sm.get("stripe_secret_key_cloudsales") as any)?.secret_id);
  const stripePk=Boolean((sm.get("stripe_publishable_key_cloudsales") as any)?.value?.key);
  const subscriptionItems=items||[];
  const pricesReady=subscriptionItems.length>=3&&subscriptionItems.every((item:any)=>Boolean(item.stripe_price_id&&item.metadata?.stripe_account_alias==="cloudsales_dedicated"&&item.metadata?.cloudsales_new_checkout_allowed===true));
  return{
    stripe:stripeSecret&&stripePk,
    stripe_prices:pricesReady,
    cloudflare:Boolean((sm.get("cloudflare_api_token_cloudsales") as any)?.secret_id),
    highlevel:ready("highlevel"),
    google_ads:ready("google_ads"),
    google_developer_token:Boolean((sm.get("google_ads_developer_token") as any)?.secret_id),
    meta_ads:ready("meta_ads"),
  };
}
async function storeSecret(svc:any,key:string,value:string,name:string,description="CloudSales secure configuration"){
  const {data:old}=await svc.from("internal_settings").select("secret_id").eq("setting_key",key).maybeSingle();
  let secretId=old?.secret_id;
  if(secretId){
    const {error}=await svc.rpc("service_update_secret",{p_secret_id:secretId,p_secret:value,p_name:name,p_description:description});if(error)throw error;
  }else{
    const {data,error}=await svc.rpc("service_store_secret",{p_secret:value,p_name:name,p_description:description});if(error||!data)throw error||new Error("secret_storage_failed");secretId=data;
  }
  await svc.from("internal_settings").upsert({setting_key:key,secret_id:secretId,value:{configured:true,updated_at:new Date().toISOString()}},{onConflict:"setting_key"});
  return secretId;
}
async function upsertProvider(svc:any,providerKey:string,clientId:string,secretId:string,redirectUri:string,extra:any={}){
  const {data:old}=await svc.from("provider_app_credentials").select("metadata").eq("provider_key",providerKey).maybeSingle();
  const {error}=await svc.from("provider_app_credentials").upsert({provider_key:providerKey,client_id:clientId,client_secret_secret_id:secretId,redirect_uri:redirectUri,enabled:true,metadata:{...(old?.metadata||{}),...extra,configured_via:"admin_secure_setup",configured_at:new Date().toISOString()}},{onConflict:"provider_key"});
  if(error)throw error;
}
async function issueSetupLink(svc:any,req:Request){
  const supplied=req.headers.get("x-cloudsales-worker-token")||"";
  const {data:setting}=await svc.from("internal_settings").select("secret_id").eq("setting_key","automation_worker_token").maybeSingle();
  if(!setting?.secret_id)return json({error:"issuer_not_configured"},503);
  const {data:expected}=await svc.rpc("service_read_secret",{p_secret_id:setting.secret_id});
  if(!expected||!(await same(supplied,String(expected))))return json({error:"forbidden"},403);
  let body:any={};try{body=await req.json()}catch{return json({error:"invalid_json"},400)}
  const requested=Number(body.ttl_minutes||30);const ttl=Math.min(60,Math.max(5,Number.isFinite(requested)?Math.round(requested):30));
  const token=randomToken(),hash=await sha(token),expiresAt=new Date(Date.now()+ttl*60_000).toISOString();
  await svc.from("admin_setup_tokens").update({revoked_at:new Date().toISOString()}).eq("purpose",PURPOSE).is("revoked_at",null).gt("expires_at",new Date().toISOString());
  const {error}=await svc.from("admin_setup_tokens").insert({token_hash:hash,purpose:PURPOSE,expires_at:expiresAt,use_count:0});
  if(error)return json({error:"setup_token_create_failed"},500);
  await svc.from("audit_log").insert({actor_type:"system",action:"admin.setup.link.issued",entity_type:"admin_setup_token",entity_id:hash.slice(0,24),success:true,context:{purpose:PURPOSE,ttl_minutes:ttl,expires_at:expiresAt}});
  return json({setup_url:`${SUPABASE_URL}/functions/v1/admin-secrets-setup?token=${encodeURIComponent(token)}`,expires_at:expiresAt,purpose:PURPOSE,ttl_minutes:ttl},200);
}

Deno.serve(async req=>{
  const svc=createClient(SUPABASE_URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
  const requestUrl=new globalThis.URL(req.url);
  if(req.method==="POST"&&(requestUrl.pathname.endsWith("/issue")||requestUrl.searchParams.get("action")==="issue"))return await issueSetupLink(svc,req);
  if(req.method==="GET"){
    const token=requestUrl.searchParams.get("token")||"";
    if(!(await validToken(svc,token)))return new Response(page("",EMPTY_STATUS,"This setup link is invalid or expired."),{status:403,headers:htmlHeaders});
    return new Response(page(token,await status(svc)),{headers:htmlHeaders});
  }
  if(req.method!=="POST")return new Response("Method not allowed",{status:405,headers:htmlHeaders});
  const form=await req.formData();
  const token=String(form.get("setup_token")||"");
  if(!(await validToken(svc,token)))return new Response(page("",EMPTY_STATUS,"This setup link is invalid or expired."),{status:403,headers:htmlHeaders});
  try{
    const stripeSecret=String(form.get("stripe_secret")||"").trim();
    const stripePk=String(form.get("stripe_publishable")||"").trim();
    const cloudflare=String(form.get("cloudflare_token")||"").trim();
    const highlevelId=String(form.get("highlevel_client_id")||"").trim();
    const highlevelSecret=String(form.get("highlevel_client_secret")||"").trim();
    const highlevelInstall=String(form.get("highlevel_install_url")||"").trim();
    const highlevelRedirect=String(form.get("highlevel_redirect_uri")||"").trim();
    const googleId=String(form.get("google_ads_client_id")||"").trim();
    const googleSecret=String(form.get("google_ads_client_secret")||"").trim();
    const googleDeveloper=String(form.get("google_ads_developer_token")||"").trim();
    const metaId=String(form.get("meta_ads_app_id")||"").trim();
    const metaSecret=String(form.get("meta_ads_app_secret")||"").trim();
    const saved:string[]=[];

    if(stripeSecret||stripePk){
      if(!(stripeSecret&&stripePk))throw new Error("Stripe requires the dedicated live secret and publishable keys together.");
      if(!stripeSecret.startsWith("sk_live_"))throw new Error("Stripe secret must be a live sk_live_ key.");
      if(!stripePk.startsWith("pk_live_"))throw new Error("Stripe publishable key must start with pk_live_.");
      await storeSecret(svc,"stripe_secret_key_cloudsales",stripeSecret,"cloudsales/stripe/dedicated/live-secret","Dedicated CloudSales Stripe live secret");
      await svc.from("internal_settings").upsert({setting_key:"stripe_publishable_key_cloudsales",secret_id:null,value:{key:stripePk,configured:true,account_alias:"cloudsales_dedicated",updated_at:new Date().toISOString()}},{onConflict:"setting_key"});
      const {data:billing}=await svc.from("internal_settings").select("value").eq("setting_key","billing_checkout").maybeSingle();
      await svc.from("internal_settings").upsert({setting_key:"billing_checkout",value:{...(billing?.value||{}),provider:"stripe",brand:"cloudsales",account_alias:"cloudsales_dedicated",dedicated_account_required:true,dedicated_keys_configured:true,checkout_enabled:false,prices_migration_required:true,legacy_shared_account_blocked:true,updated_at:new Date().toISOString()}},{onConflict:"setting_key"});
      saved.push("Dedicated CloudSales Stripe keys");
    }
    if(cloudflare){
      if(cloudflare.length<20||/\s/.test(cloudflare))throw new Error("Cloudflare token format is invalid.");
      await storeSecret(svc,"cloudflare_api_token_cloudsales",cloudflare,"cloudsales/cloudflare/api-token","CloudSales Cloudflare API token");saved.push("Cloudflare token");
    }
    if(highlevelId||highlevelSecret||highlevelInstall){
      if(!(highlevelId&&highlevelSecret&&highlevelInstall))throw new Error("HighLevel requires Client ID, Client Secret, and Installation URL together.");
      const secretId=await storeSecret(svc,"highlevel_client_secret_cloudsales",highlevelSecret,"cloudsales/highlevel/client-secret","CloudSales HighLevel app secret");
      await upsertProvider(svc,"highlevel",highlevelId,secretId,highlevelRedirect||"https://app.cloudsales.app/?oauth=highlevel",{install_url:highlevelInstall});saved.push("HighLevel OAuth app");
    }
    if(googleId||googleSecret||googleDeveloper){
      if(!(googleId&&googleSecret&&googleDeveloper))throw new Error("Google Ads requires Client ID, Client Secret, and Developer Token together.");
      if(!googleId.includes(".apps.googleusercontent.com"))throw new Error("Google OAuth Client ID format is invalid.");
      const secretId=await storeSecret(svc,"google_ads_client_secret_cloudsales",googleSecret,"cloudsales/google-ads/client-secret","CloudSales Google Ads OAuth client secret");
      await storeSecret(svc,"google_ads_developer_token",googleDeveloper,"cloudsales/google-ads/developer-token","CloudSales Google Ads Developer Token");
      await upsertProvider(svc,"google_ads",googleId,secretId,OAUTH_RELAY,{oauth_scope:"https://www.googleapis.com/auth/adwords",api_version:"v25",billing_mode:"provider_managed"});saved.push("Google Ads platform OAuth");
    }
    if(metaId||metaSecret){
      if(!(metaId&&metaSecret))throw new Error("Meta Ads requires App ID and App Secret together.");
      if(!/^\d{5,30}$/.test(metaId))throw new Error("Meta App ID format is invalid.");
      const secretId=await storeSecret(svc,"meta_ads_app_secret_cloudsales",metaSecret,"cloudsales/meta-ads/app-secret","CloudSales Meta Ads App Secret");
      await upsertProvider(svc,"meta_ads",metaId,secretId,OAUTH_RELAY,{oauth_scopes:["ads_read","ads_management"],billing_mode:"provider_managed",signals_provider_key:"meta"});saved.push("Meta Ads platform OAuth");
    }

    await svc.from("admin_setup_tokens").update({use_count:1,last_used_at:new Date().toISOString(),revoked_at:new Date().toISOString()}).eq("token_hash",await sha(token));
    await svc.from("audit_log").insert({actor_type:"system",action:"admin.secure_setup.saved",entity_type:"admin_setup",entity_id:"cloudsales",success:true,context:{saved,secret_values_logged:false,stripe_isolation:"dedicated_only"}});
    const finalStatus=await status(svc);
    return new Response(page("",finalStatus,saved.length?`Saved securely: ${saved.join(", ")}. This link is now revoked.`:"No changes were submitted. This link is now revoked.",true),{headers:htmlHeaders});
  }catch(error){
    const message=String((error as Error).message||"Setup failed").slice(0,300);
    await svc.from("audit_log").insert({actor_type:"system",action:"admin.secure_setup.failed",entity_type:"admin_setup",entity_id:"cloudsales",success:false,context:{error:message,secret_values_logged:false}}).catch(()=>{});
    return new Response(page(token,await status(svc),message,false),{status:400,headers:htmlHeaders});
  }
});
