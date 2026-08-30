import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")!;
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED=new Set([
  "https://cloudsales.app",
  "https://www.cloudsales.app",
  "https://app.cloudsales.app",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function cors(origin:string|null){
  const value=origin&&ALLOWED.has(origin)?origin:"https://cloudsales.app";
  return {
    "Access-Control-Allow-Origin":value,
    "Access-Control-Allow-Headers":"content-type,authorization,x-client-info,apikey",
    "Access-Control-Allow-Methods":"POST,OPTIONS",
    "Vary":"Origin",
  };
}
function json(body:unknown,status=200,origin:string|null=null){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      ...cors(origin),
      "content-type":"application/json;charset=utf-8",
      "cache-control":"no-store",
      "x-content-type-options":"nosniff",
      "referrer-policy":"no-referrer",
    },
  });
}
function validEmail(value:string){return !value||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
function enc(form:URLSearchParams,key:string,value:unknown){if(value===null||value===undefined||value==='')return;form.append(key,String(value))}

async function readSecret(svc:any,key:string){
  const {data:setting}=await svc.from("internal_settings").select("secret_id").eq("setting_key",key).maybeSingle();
  if(!setting?.secret_id)return null;
  const {data}=await svc.rpc("service_read_secret",{p_secret_id:setting.secret_id});
  return data?String(data):null;
}
async function dedicatedCredentials(svc:any){
  const secret=Deno.env.get("STRIPE_SECRET_KEY_CLOUDSALES")||await readSecret(svc,"stripe_secret_key_cloudsales");
  let publishable=Deno.env.get("STRIPE_PUBLISHABLE_KEY_CLOUDSALES")||null;
  if(!publishable){
    const {data:p}=await svc.from("internal_settings").select("value").eq("setting_key","stripe_publishable_key_cloudsales").maybeSingle();
    publishable=String(p?.value?.key||"")||null;
  }
  return{secret,publishable};
}

Deno.serve(async req=>{
  const origin=req.headers.get("origin");
  try{
    if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
    if(req.method!=="POST")return json({error:"method_not_allowed"},405,origin);
    if(origin&&!ALLOWED.has(origin))return json({error:"origin_not_allowed"},403,origin);
    if(Number(req.headers.get("content-length")||0)>32768)return json({error:"payload_too_large"},413,origin);

    let body:any;
    try{body=await req.json()}catch{return json({error:"invalid_json"},400,origin)}
    const itemKey=String(body.item_key||"").trim();
    const email=String(body.email||"").trim().toLowerCase().slice(0,320);
    const affiliateCode=String(body.affiliate_code||"").trim().toUpperCase().slice(0,64);
    let quantity=Math.max(1,Math.min(100,Math.floor(Number(body.quantity??1)||1));
    if(!itemKey)return json({error:"item_key_required"},400,origin);
    if(!validEmail(email))return json({error:"invalid_email"},400,origin);

    const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
    const ip=String((req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim()).slice(0,80);
    const {data:allowed}=await svc.rpc("consume_rate_limit",{p_bucket_key:`checkout:${ip}`,p_limit:20,p_window_seconds:600});
    if(allowed!==true)return json({error:"rate_limited"},429,origin);

    const {data:billing}=await svc.from("internal_settings").select("value").eq("setting_key","billing_checkout").maybeSingle();
    const config=billing?.value||{};
    const dedicatedEnabled=config.checkout_enabled===true&&config.account_alias==="cloudsales_dedicated"&&config.dedicated_account_required===true;
    if(!dedicatedEnabled){
      await svc.from("audit_log").insert({
        actor_type:"system",
        action:"billing.checkout.blocked",
        entity_type:"billing_config",
        entity_id:"cloudsales",
        success:true,
        context:{reason:"dedicated_stripe_required",account_alias:config.account_alias||null,item_key:itemKey},
      }).catch(()=>{});
      return json({
        error:"cloudsales_dedicated_stripe_required",
        checkout_enabled:false,
        payment_taken:false,
        next_action:"configure_cloudsales_dedicated_stripe",
      },503,origin);
    }

    const {data:item,error:itemErr}=await svc.from("billable_items")
      .select("item_key,brand_key,category,name,amount_usd,billing_type,active,stripe_price_id,metadata")
      .eq("item_key",itemKey)
      .eq("brand_key","cloudsales")
      .eq("active",true)
      .maybeSingle();
    if(itemErr)throw new Error("billable_item_lookup_failed");
    if(!item)return json({error:"item_not_found"},404,origin);
    if(item.billing_type==="per_participant")quantity=Math.max(Number(item.metadata?.minimum_participants||1),quantity);

    const itemDedicated=item.metadata?.stripe_account_alias==="cloudsales_dedicated"&&item.metadata?.cloudsales_new_checkout_allowed===true;
    if(!itemDedicated||!item.stripe_price_id){
      return json({
        error:"cloudsales_stripe_item_migration_required",
        item_key:item.item_key,
        payment_taken:false,
      },503,origin);
    }

    const creds=await dedicatedCredentials(svc);
    if(!creds.secret||!creds.publishable)return json({error:"cloudsales_dedicated_stripe_not_configured",payment_taken:false},503,origin);
    if(!String(creds.secret).startsWith("sk_live_")||!String(creds.publishable).startsWith("pk_live_")){
      return json({error:"cloudsales_dedicated_stripe_live_keys_required",payment_taken:false},503,origin);
    }

    let affiliate:any=null;
    if(affiliateCode){
      const {data:a}=await svc.from("affiliate_profiles").select("id,code,status,commission_rate").eq("code",affiliateCode).eq("status","active").maybeSingle();
      if(a)affiliate=a;
    }
    const mode=item.billing_type==="monthly"?"subscription":"payment";
    const trialDays=mode==="subscription"?Math.max(0,Math.min(90,Number(item.metadata?.trial_days||0))):0;

    const form=new URLSearchParams();
    enc(form,"mode",mode);
    enc(form,"ui_mode","embedded");
    enc(form,"line_items[0][price]",item.stripe_price_id);
    enc(form,"line_items[0][quantity]",quantity);
    enc(form,"return_url","https://cloudsales.app/?checkout=return&session_id={CHECKOUT_SESSION_ID}");
    enc(form,"allow_promotion_codes","true");
    enc(form,"billing_address_collection","auto");
    if(email)enc(form,"customer_email",email);
    const metadata={
      brand:"cloudsales",
      account_alias:"cloudsales_dedicated",
      cohort:"first_100",
      item_key:item.item_key,
      category:item.category,
      affiliate_code:affiliate?.code||"",
      affiliate_id:affiliate?.id||"",
    };
    for(const [key,value] of Object.entries(metadata))enc(form,`metadata[${key}]`,value);
    if(mode==="subscription"){
      for(const [key,value] of Object.entries(metadata))enc(form,`subscription_data[metadata][${key}]`,value);
      if(trialDays>0){
        enc(form,"subscription_data[trial_period_days]",trialDays);
        enc(form,"payment_method_collection","always");
        enc(form,"metadata[trial_days]",trialDays);
        enc(form,"subscription_data[metadata][trial_days]",trialDays);
      }
    }
    enc(form,"branding_settings[background_color]","#060611");
    enc(form,"branding_settings[button_color]","#ff2b9b");
    enc(form,"branding_settings[border_style]","pill");

    const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{
      method:"POST",
      headers:{Authorization:`Bearer ${creds.secret}`,"content-type":"application/x-www-form-urlencoded"},
      body:form.toString(),
    });
    const raw=await response.text();
    let data:any={};try{data=JSON.parse(raw)}catch{}
    if(!response.ok||!data.client_secret)return json({error:"stripe_session_failed",status:response.status},502,origin);

    await svc.from("checkout_sessions").upsert({
      stripe_session_id:String(data.id),
      item_key:item.item_key,
      email:email||null,
      quantity,
      mode,
      status:"open",
      metadata:{
        brand:"cloudsales",
        account_alias:"cloudsales_dedicated",
        cohort:"first_100",
        category:item.category,
        trial_days:trialDays,
        affiliate_code:affiliate?.code||null,
        affiliate_id:affiliate?.id||null,
        commission_rate:affiliate?Number(affiliate.commission_rate):null,
      },
    },{onConflict:"stripe_session_id"});

    return json({
      client_secret:data.client_secret,
      publishable_key:creds.publishable,
      session_id:data.id,
      checkout_mode:"embedded",
      account_alias:"cloudsales_dedicated",
      item:{item_key:item.item_key,name:item.name,amount_usd:item.amount_usd,billing_type:item.billing_type,quantity,trial_days:trialDays},
      trial:{enabled:trialDays>0,days:trialDays,auto_charge_after_trial:trialDays>0},
      affiliate:affiliate?{code:affiliate.code,attributed:true}:null,
    },200,origin);
  }catch(error){
    const message=String((error as Error).message||error).slice(0,180);
    try{
      const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
      await svc.from("audit_log").insert({actor_type:"system",action:"billing.checkout.internal_error",entity_type:"system",entity_id:"stripe-checkout-start",success:false,context:{error:message}});
    }catch{}
    return json({error:"checkout_internal_error",payment_taken:false},500,origin);
  }
});
