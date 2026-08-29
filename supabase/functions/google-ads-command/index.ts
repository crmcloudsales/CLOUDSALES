import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!;
const A=Deno.env.get("SUPABASE_ANON_KEY")!;
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERSION="v25";
const API=`https://googleads.googleapis.com/${VERSION}`;
const BILLING_PORTAL="https://ads.google.com/";
const ORIGINS=new Set(["https://cloudsales.app","https://www.cloudsales.app","https://app.cloudsales.app","http://localhost:3000","http://localhost:5173"]);
const READ_ACTIONS=new Set(["ads.google.platform_status","ads.google.accounts","ads.google.sync","ads.google.billing.manage"]);
const OPERATOR_ACTIONS=new Set(["ads.google.pause"]);
const ADMIN_ACTIONS=new Set(["ads.google.account.select","ads.google.resume","ads.google.budget","ads.google.create_campaign"]);

function cors(o:string|null){const v=o&&ORIGINS.has(o)?o:"https://app.cloudsales.app";return{"Access-Control-Allow-Origin":v,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}}
function json(b:unknown,s=200,o:string|null=null){return new Response(JSON.stringify(b),{status:s,headers:{...cors(o),"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}})}
const text=(v:any,n=500)=>String(v??"").trim().slice(0,n);
const now=()=>new Date().toISOString();
const customerId=(v:any)=>String(v??"").replace(/\D/g,"").slice(0,20);
const micros=(v:any)=>{const n=Number(v);if(!Number.isFinite(n)||n<=0)throw new Error("google_budget_must_be_positive");return Math.round(n*1_000_000)};
const major=(v:any)=>Number(v||0)/1_000_000;
function localStatus(v:any){const s=String(v||"").toUpperCase();if(s==="ENABLED")return"active";if(s==="PAUSED")return"paused";if(s==="REMOVED")return"archived";return"draft"}
function sensitivePaymentData(v:any,depth=0):boolean{if(depth>4||v==null)return false;if(Array.isArray(v))return v.some(x=>sensitivePaymentData(x,depth+1));if(typeof v!=="object")return false;for(const [k,x] of Object.entries(v)){if(/(^|_)(card|card_number|pan|cvc|cvv|expiry|expiration|security_code)(_|$)/i.test(k))return true;if(sensitivePaymentData(x,depth+1))return true}return false}
function apiError(data:any,status:number){const detail=data?.error?.details?.[0]?.errors?.[0]?.message||data?.error?.message||data?.message||`HTTP ${status}`;return `google_ads_request_failed:${status}:${text(detail,600)}`}

Deno.serve(async req=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405,origin);
  if(origin&&!ORIGINS.has(origin))return json({error:"origin_not_allowed"},403,origin);
  const auth=req.headers.get("authorization");if(!auth)return json({error:"missing_authorization"},401,origin);
  const uc=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud}=await uc.auth.getUser();const user=ud.user;if(!user)return json({error:"invalid_session"},401,origin);
  let body:any;try{body=await req.json()}catch{return json({error:"invalid_json"},400,origin)}
  const org=String(body.organization_id||""),action=String(body.action||""),input=body.input&&typeof body.input==="object"?body.input:{};
  if(!org||!action)return json({error:"missing_required_fields"},400,origin);
  if(sensitivePaymentData(input))return json({error:"payment_card_data_not_allowed",billing_mode:"provider_managed"},400,origin);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:m}=await svc.from("organization_members").select("role,status").eq("organization_id",org).eq("user_id",user.id).maybeSingle();
  const role=String(m?.role||"");if(!m||m.status!=="active"||!["owner","admin","operator","viewer"].includes(role))return json({error:"forbidden"},403,origin);
  if(role==="viewer"&&!READ_ACTIONS.has(action))return json({error:"insufficient_role"},403,origin);
  if(role==="operator"&&!(READ_ACTIONS.has(action)||OPERATOR_ACTIONS.has(action)))return json({error:"insufficient_role"},403,origin);
  if(ADMIN_ACTIONS.has(action)&&!["owner","admin"].includes(role))return json({error:"owner_or_admin_required"},403,origin);
  if(!(READ_ACTIONS.has(action)||OPERATOR_ACTIONS.has(action)||ADMIN_ACTIONS.has(action)))return json({error:"unsupported_action"},400,origin);

  async function platform(){
    const [p,c,d,conn]=await Promise.all([
      svc.from("provider_catalog").select("provider_key,display_name,availability,metadata").eq("provider_key","google_ads").maybeSingle(),
      svc.from("provider_app_credentials").select("client_id,client_secret_secret_id,redirect_uri,enabled,metadata").eq("provider_key","google_ads").maybeSingle(),
      svc.from("internal_settings").select("secret_id,value").eq("setting_key","google_ads_developer_token").maybeSingle(),
      svc.from("connections").select("id,status,external_account_name,expires_at,metadata").eq("organization_id",org).eq("provider_key","google_ads").order("created_at",{ascending:false}).limit(1).maybeSingle(),
    ]);
    const app=Boolean(c.data?.enabled&&c.data?.client_id&&c.data?.client_secret_secret_id&&c.data?.redirect_uri),developer=Boolean(d.data?.secret_id);
    return{provider:p.data||null,oauth_app_configured:app,developer_token_configured:developer,ready_for_oauth:app&&developer,connection:conn.data||null,missing:[...(app?[]:["google_oauth_client"]),...(developer?[]:["google_ads_developer_token"])],billing:{mode:"provider_managed",portal_url:BILLING_PORTAL,card_data_stored_by_cloudsales:false}};
  }

  if(action==="ads.google.platform_status")return json({output:await platform()},200,origin);
  if(action==="ads.google.billing.manage"){
    const p=await platform();
    return json({output:{provider:"google_ads",mode:"provider_managed",portal_url:BILLING_PORTAL,selected_customer_id:p.connection?.metadata?.selected_customer_id||null,instructions:"Open Google Ads and use Billing > Payment methods. CloudSales never receives card number or CVC.",card_data_stored_by_cloudsales:false}},200,origin);
  }

  const p=await platform();if(!p.oauth_app_configured||!p.developer_token_configured)return json({error:"google_ads_platform_not_configured",setup:p},503,origin);
  const {data:conn}=await svc.from("connections").select("id,status,external_account_id,external_account_name,scopes,expires_at,metadata,last_sync_at").eq("organization_id",org).eq("provider_key","google_ads").eq("status","connected").order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(!conn)return json({error:"google_ads_connection_required",next_action:"connect_google_ads"},409,origin);
  const {data:sec}=await svc.from("connection_secrets").select("access_token_secret_id,refresh_token_secret_id").eq("connection_id",conn.id).maybeSingle();
  if(!sec?.access_token_secret_id)return json({error:"google_ads_access_token_missing"},503,origin);

  async function appCredentials(){
    const {data:c}=await svc.from("provider_app_credentials").select("client_id,client_secret_secret_id,redirect_uri,enabled").eq("provider_key","google_ads").maybeSingle();
    if(!c?.enabled||!c.client_id||!c.client_secret_secret_id)return null;
    const {data:s}=await svc.rpc("service_read_secret",{p_secret_id:c.client_secret_secret_id});return s?{...c,client_secret:String(s)}:null;
  }
  async function accessToken(){
    const exp=conn.expires_at?new Date(conn.expires_at).getTime():0;
    const {data:current}=await svc.rpc("service_read_secret",{p_secret_id:sec.access_token_secret_id});
    if(current&&(!exp||exp>Date.now()+90_000))return String(current);
    if(!sec.refresh_token_secret_id)throw new Error("google_ads_refresh_token_missing");
    const [{data:refresh},app]=await Promise.all([svc.rpc("service_read_secret",{p_secret_id:sec.refresh_token_secret_id}),appCredentials()]);
    if(!refresh||!app)throw new Error("google_ads_refresh_not_configured");
    const f=new URLSearchParams({client_id:app.client_id,client_secret:app.client_secret,refresh_token:String(refresh),grant_type:"refresh_token"});
    const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded",accept:"application/json"},body:f});const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.access_token)throw new Error(apiError(d,r.status));
    await svc.rpc("service_update_secret",{p_secret_id:sec.access_token_secret_id,p_secret:String(d.access_token),p_name:`cloudsales/google_ads/${conn.id}/access`,p_description:"Google Ads OAuth access token"});
    const expiresAt=new Date(Date.now()+Number(d.expires_in||3600)*1000).toISOString();await svc.from("connections").update({expires_at:expiresAt,updated_at:now()}).eq("id",conn.id);conn.expires_at=expiresAt;return String(d.access_token);
  }
  const {data:devSetting}=await svc.from("internal_settings").select("secret_id").eq("setting_key","google_ads_developer_token").maybeSingle();
  if(!devSetting?.secret_id)return json({error:"google_ads_developer_token_missing"},503,origin);
  const {data:developerToken}=await svc.rpc("service_read_secret",{p_secret_id:devSetting.secret_id});if(!developerToken)return json({error:"google_ads_developer_token_unavailable"},503,origin);

  async function call(path:string,method="GET",payload:any=null,loginId:string|null=null){
    const token=await accessToken();const h:any={Authorization:`Bearer ${token}`,"developer-token":String(developerToken),accept:"application/json"};if(loginId)h["login-customer-id"]=customerId(loginId);if(payload!==null)h["content-type"]="application/json";
    const r=await fetch(`${API}/${String(path).replace(/^\/+/,"")}`,{method,headers:h,body:payload===null?undefined:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));if(!r.ok||d?.error)throw new Error(apiError(d,r.status));return d;
  }
  async function search(cid:string,query:string,login:string|null=null){return await call(`customers/${customerId(cid)}/googleAds:search`,"POST",{query,pageSize:10000},login)}
  async function directAccounts(){
    const a=await call("customers:listAccessibleCustomers");const ids=(a.resourceNames||[]).map((x:string)=>customerId(x)).filter(Boolean);const out:any[]=[];
    for(const id of ids.slice(0,25)){
      try{const d=await search(id,"SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager, customer.status FROM customer LIMIT 1");const c=d.results?.[0]?.customer;if(c)out.push({id:customerId(c.id||id),name:text(c.descriptiveName||`Google Ads ${id}`,200),currency:String(c.currencyCode||"USD"),timezone:text(c.timeZone,100),manager:Boolean(c.manager),status:String(c.status||""),login_customer_id:null});else out.push({id,name:`Google Ads ${id}`,currency:"USD",timezone:"",manager:false,status:"",login_customer_id:null})}catch{out.push({id,name:`Google Ads ${id}`,currency:"",timezone:"",manager:false,status:"",login_customer_id:null})}
    }
    const expanded=[...out];
    for(const mgr of out.filter(x=>x.manager).slice(0,10)){
      try{const d=await search(mgr.id,"SELECT customer_client.client_customer, customer_client.descriptive_name, customer_client.currency_code, customer_client.time_zone, customer_client.manager, customer_client.status, customer_client.level FROM customer_client WHERE customer_client.level <= 1",mgr.id);for(const r of d.results||[]){const c=r.customerClient||{},id=customerId(c.clientCustomer);if(id&&!c.manager)expanded.push({id,name:text(c.descriptiveName||`Google Ads ${id}`,200),currency:String(c.currencyCode||""),timezone:text(c.timeZone,100),manager:false,status:String(c.status||""),login_customer_id:mgr.id})}}catch{}
    }
    const map=new Map<string,any>();for(const x of expanded)if(x.id&&!map.has(x.id))map.set(x.id,x);return[...map.values()];
  }
  async function accountsState(){const accounts=await directAccounts();const wanted=customerId(conn.metadata?.selected_customer_id||"");const selected=accounts.some(x=>x.id===wanted)?wanted:null;return{connected:true,accounts,selected_customer_id:selected,selected_login_customer_id:selected?accounts.find(x=>x.id===selected)?.login_customer_id||null:null,api_version:VERSION}}
  async function requireAccount(requested:any=null){const state=await accountsState();let id=customerId(requested||state.selected_customer_id||"");if(!id){const eligible=state.accounts.filter((x:any)=>!x.manager);if(eligible.length===1)id=eligible[0].id;else throw new Error("google_ads_customer_selection_required")}const account=state.accounts.find((x:any)=>x.id===id&&!x.manager);if(!account)throw new Error("google_ads_customer_not_authorized");return{state,account}}
  async function localCampaign(id:string){const {data}=await svc.from("marketing_campaigns").select("*").eq("id",id).eq("organization_id",org).eq("provider_key","google_ads").maybeSingle();if(!data)throw new Error("google_campaign_not_found");return data}
  async function syncRow(account:any,r:any){
    const c=r.campaign||{},b=r.campaignBudget||{},mt=r.metrics||{};const ext=String(c.id||"");if(!ext)return null;
    const {data:existing}=await svc.from("marketing_campaigns").select("id,qualified_leads,revenue,metadata").eq("organization_id",org).eq("provider_key","google_ads").eq("external_campaign_id",ext).maybeSingle();
    const row:any={organization_id:org,provider_key:"google_ads",external_campaign_id:ext,name:text(c.name||`Google Ads ${ext}`,180),objective:text(c.advertisingChannelType,120),status:localStatus(c.status),daily_budget:major(b.amountMicros),lifetime_budget:null,currency:account.currency||"USD",spend:major(mt.costMicros),leads:0,last_sync_at:now(),updated_at:now(),metadata:{...(existing?.metadata||{}),google_customer_id:account.id,google_login_customer_id:account.login_customer_id||null,google_campaign_resource:c.resourceName||`customers/${account.id}/campaigns/${ext}`,google_campaign_budget_resource:c.campaignBudget||b.resourceName||null,google_advertising_channel_type:c.advertisingChannelType||null,google_conversions:Number(mt.conversions||0),google_all_conversions:Number(mt.allConversions||0),provider_confirmed_at:now()}};
    if(existing?.id){const {data,error}=await svc.from("marketing_campaigns").update(row).eq("id",existing.id).select("*").single();if(error)throw new Error("google_campaign_local_sync_failed");return data}
    row.qualified_leads=0;row.revenue=0;row.created_by=user.id;const {data,error}=await svc.from("marketing_campaigns").insert(row).select("*").single();if(error)throw new Error("google_campaign_local_insert_failed");return data;
  }

  try{
    let output:any;
    if(action==="ads.google.accounts")output=await accountsState();
    else if(action==="ads.google.account.select"){
      const {account}=await requireAccount(input.customer_id);const metadata={...(conn.metadata||{}),selected_customer_id:account.id,selected_customer_name:account.name,selected_customer_currency:account.currency,selected_customer_timezone:account.timezone,selected_login_customer_id:account.login_customer_id||null,customer_selected_at:now()};await svc.from("connections").update({metadata,last_sync_at:now()}).eq("id",conn.id);output={selected:account};
    }else if(action==="ads.google.sync"){
      const {account}=await requireAccount(input.customer_id);const q="SELECT campaign.id, campaign.resource_name, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.campaign_budget, campaign_budget.resource_name, campaign_budget.amount_micros, metrics.cost_micros, metrics.conversions, metrics.all_conversions FROM campaign WHERE campaign.status != 'REMOVED' AND segments.date DURING LAST_30_DAYS ORDER BY campaign.id";const d=await search(account.id,q,account.login_customer_id);const rows=[];for(const r of d.results||[]){const x=await syncRow(account,r);if(x)rows.push(x)}const metadata={...(conn.metadata||{}),selected_customer_id:account.id,selected_customer_name:account.name,selected_customer_currency:account.currency,selected_customer_timezone:account.timezone,selected_login_customer_id:account.login_customer_id||null,campaigns_last_sync_at:now()};await svc.from("connections").update({metadata,last_sync_at:now()}).eq("id",conn.id);output={account,campaigns:rows,count:rows.length,synced_at:now()};
    }else if(action==="ads.google.pause"||action==="ads.google.resume"){
      const local=await localCampaign(String(input.id||input.campaign_id||""));const {account}=await requireAccount(local.metadata?.google_customer_id||input.customer_id);const status=action==="ads.google.pause"?"PAUSED":"ENABLED";const resource=String(local.metadata?.google_campaign_resource||`customers/${account.id}/campaigns/${local.external_campaign_id}`);await call(`customers/${account.id}/campaigns:mutate`,"POST",{operations:[{update:{resourceName:resource,status},updateMask:"status"}],responseContentType:"MUTABLE_RESOURCE"},account.login_customer_id);const q=`SELECT campaign.id, campaign.resource_name, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.campaign_budget, campaign_budget.resource_name, campaign_budget.amount_micros FROM campaign WHERE campaign.id = ${customerId(local.external_campaign_id)} LIMIT 1`;const d=await search(account.id,q,account.login_customer_id);const c=d.results?.[0]?.campaign;if(String(c?.status||"")!==status)throw new Error("google_campaign_status_confirmation_failed");const row=await syncRow(account,d.results[0]);output={campaign:row,provider_status:status,confirmed:true,confirmed_at:now()};
    }else if(action==="ads.google.budget"){
      const local=await localCampaign(String(input.id||input.campaign_id||""));const {account}=await requireAccount(local.metadata?.google_customer_id||input.customer_id);const resource=String(local.metadata?.google_campaign_budget_resource||"");if(!resource)throw new Error("google_campaign_budget_resource_missing");const amount=micros(input.daily_budget);await call(`customers/${account.id}/campaignBudgets:mutate`,"POST",{operations:[{update:{resourceName:resource,amountMicros:String(amount)},updateMask:"amount_micros"}],responseContentType:"MUTABLE_RESOURCE"},account.login_customer_id);const q=`SELECT campaign.id, campaign.resource_name, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.campaign_budget, campaign_budget.resource_name, campaign_budget.amount_micros FROM campaign WHERE campaign.id = ${customerId(local.external_campaign_id)} LIMIT 1`;const d=await search(account.id,q,account.login_customer_id);const confirmed=Number(d.results?.[0]?.campaignBudget?.amountMicros||0);if(confirmed!==amount)throw new Error("google_daily_budget_confirmation_failed");const row=await syncRow(account,d.results[0]);output={campaign:row,provider:{daily_budget:major(confirmed),currency:account.currency},confirmed:true,confirmed_at:now()};
    }else if(action==="ads.google.create_campaign"){
      const {account}=await requireAccount(input.customer_id);const name=text(input.name,180);if(!name)throw new Error("google_campaign_name_required");const amount=micros(input.daily_budget);const b=await call(`customers/${account.id}/campaignBudgets:mutate`,"POST",{operations:[{create:{name:`${name} Budget ${Date.now()}`,amountMicros:String(amount),deliveryMethod:"STANDARD",explicitlyShared:false}}],responseContentType:"MUTABLE_RESOURCE"},account.login_customer_id);const budgetResource=String(b.results?.[0]?.resourceName||b.results?.[0]?.campaignBudget?.resourceName||"");if(!budgetResource)throw new Error("google_campaign_budget_create_failed");const c=await call(`customers/${account.id}/campaigns:mutate`,"POST",{operations:[{create:{campaignBudget:budgetResource,name,advertisingChannelType:"SEARCH",status:"PAUSED",manualCpc:{},networkSettings:{targetGoogleSearch:true,targetSearchNetwork:true,targetContentNetwork:false,targetPartnerSearchNetwork:false}}}],responseContentType:"MUTABLE_RESOURCE"},account.login_customer_id);const resource=String(c.results?.[0]?.resourceName||c.results?.[0]?.campaign?.resourceName||"");if(!resource)throw new Error("google_campaign_create_failed");const id=customerId(resource.split('/').pop());const q=`SELECT campaign.id, campaign.resource_name, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.campaign_budget, campaign_budget.resource_name, campaign_budget.amount_micros FROM campaign WHERE campaign.id = ${id} LIMIT 1`;const d=await search(account.id,q,account.login_customer_id);if(String(d.results?.[0]?.campaign?.status||"")!=="PAUSED")throw new Error("google_campaign_pause_confirmation_failed");const row=await syncRow(account,d.results[0]);output={campaign:row,provider_campaign:{resource_name:resource,name,status:"PAUSED"},provider_budget:{resource_name:budgetResource,daily_budget:major(amount),currency:account.currency},confirmed:true};
    }
    await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action,entity_type:"google_ads",entity_id:conn.id,connection_id:conn.id,success:true,context:{role,selected_customer_id:conn.metadata?.selected_customer_id||null}});
    return json({ok:true,action,output},200,origin);
  }catch(e){const error=text((e as Error).message,800);await svc.from("audit_log").insert({organization_id:org,actor_user_id:user.id,actor_type:"user",action,entity_type:"google_ads",entity_id:conn.id,connection_id:conn.id,success:false,context:{role,error}});return json({error},error.includes("selection_required")?409:502,origin)}
});
