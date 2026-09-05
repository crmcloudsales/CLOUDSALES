import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizePhone, telnyxFetch } from "../_shared/telnyx.ts";

const U = Deno.env.get("SUPABASE_URL")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGINS = new Set(["https://cloudsales.app","https://www.cloudsales.app","https://app.cloudsales.app","http://localhost:3000","http://localhost:5173"]);
function cors(o:string|null){const v=o&&ORIGINS.has(o)?o:"https://app.cloudsales.app";return{"Access-Control-Allow-Origin":v,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info,x-cloudsales-worker-token","Access-Control-Allow-Methods":"POST,OPTIONS",Vary:"Origin"}}
function json(b:unknown,s=200,o:string|null=null){return new Response(JSON.stringify(b),{status:s,headers:{...cors(o),"content-type":"application/json;charset=utf-8","cache-control":"no-store"}})}

async function workerAuthorized(svc:any, token:string|null){
  if(!token)return false;
  const {data:setting}=await svc.from("internal_settings").select("secret_id").eq("setting_key","automation_worker_token").maybeSingle();
  if(!setting?.secret_id)return false;
  const {data:expected}=await svc.rpc("service_read_secret",{p_secret_id:setting.secret_id});
  if(!expected)return false;
  const a=new TextEncoder().encode(String(token)),b=new TextEncoder().encode(String(expected));
  if(a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}

Deno.serve(async(req)=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405,origin);
  if(origin&&!ORIGINS.has(origin))return json({error:"origin_not_allowed"},403,origin);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const auth=req.headers.get("authorization");
  let user:any=null;
  if(auth){const uc=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});const {data}=await uc.auth.getUser();user=data.user||null;}
  const isWorker=await workerAuthorized(svc,req.headers.get("x-cloudsales-worker-token"));
  if(!user&&!isWorker)return json({error:"unauthorized"},401,origin);
  let body:any;try{body=await req.json()}catch{return json({error:"invalid_json"},400,origin)}

  let jobId=String(body.job_id||"");
  let role:string|null=null;
  if(!jobId){
    if(!user)return json({error:"worker_cannot_enqueue"},403,origin);
    const org=String(body.organization_id||""),channel=String(body.channel||"").toLowerCase(),recipient=normalizePhone(body.recipient),purpose=String(body.purpose||"manual_message");
    if(!org||!["sms","whatsapp"].includes(channel)||!recipient)return json({error:"organization_channel_recipient_required"},400,origin);
    const {data:m}=await svc.from("organization_members").select("role,status").eq("organization_id",org).eq("user_id",user.id).maybeSingle();
    if(!m||m.status!=="active"||!["owner","admin","operator"].includes(m.role))return json({error:"forbidden"},403,origin);role=m.role;
    const {data:suppression}=await svc.from("contact_suppressions").select("id,reason").eq("organization_id",org).eq("phone_normalized",recipient).eq("active",true).limit(1).maybeSingle();
    if(suppression)return json({error:"recipient_suppressed",reason:suppression.reason},423,origin);
    const idempotency=String(body.idempotency_key||crypto.randomUUID());
    const {data:job,error}=await svc.from("communications_engine_jobs").insert({organization_id:org,contact_id:body.contact_id||null,channel,purpose,recipient,body:body.body?String(body.body):null,template_key:body.template_key?String(body.template_key):null,media:Array.isArray(body.media)?body.media:[],idempotency_key:idempotency,authorization_mode:"explicit_user",authorization_ref:`user:${user.id}`,provider_key:body.provider_key?String(body.provider_key):null,connection_id:body.connection_id||null,status:"queued",metadata:{...(body.metadata||{}),requested_by:user.id}}).select("id").single();
    if(error||!job)return json({error:"job_create_failed",detail:error?.message||null},500,origin);jobId=job.id;
  }

  const {data:job}=await svc.from("communications_engine_jobs").select("*").eq("id",jobId).maybeSingle();
  if(!job)return json({error:"job_not_found"},404,origin);
  if(user){
    const {data:m}=await svc.from("organization_members").select("role,status").eq("organization_id",job.organization_id).eq("user_id",user.id).maybeSingle();
    if(!m||m.status!=="active"||!["owner","admin","operator"].includes(m.role))return json({error:"forbidden"},403,origin);role=m.role;
  }
  if(!["queued","failed"].includes(job.status))return json({error:"job_not_dispatchable",status:job.status},409,origin);
  if(job.authorization_mode==="policy"&&!job.authorization_ref)return json({error:"authorization_required"},423,origin);
  const recipient=normalizePhone(job.recipient);
  const {data:suppression}=await svc.from("contact_suppressions").select("id,reason").eq("organization_id",job.organization_id).eq("phone_normalized",recipient).eq("active",true).limit(1).maybeSingle();
  if(suppression){await svc.from("communications_engine_jobs").update({status:"suppressed",last_error:`suppressed:${suppression.reason}`}).eq("id",job.id);return json({error:"recipient_suppressed",reason:suppression.reason},423,origin);}

  let provider=String(job.provider_key||body.provider_key||"");
  if(!provider){
    const {data:routed}=await svc.from("communications_engine_providers").select("provider_key,status,priority").eq("channel",job.channel).eq("status","active").order("priority").limit(1).maybeSingle();
    provider=String(routed?.provider_key||"");
  }
  if(!provider&&body.test_mode===true&&user&&["owner","admin"].includes(role||""))provider="telnyx";
  if(provider!=="telnyx")return json({error:"no_active_communications_provider",channel:job.channel},503,origin);
  const {data:providerState}=await svc.from("communications_engine_providers").select("status").eq("provider_key","telnyx").eq("channel",job.channel).maybeSingle();
  const testAllowed=body.test_mode===true&&user&&["owner","admin"].includes(role||"");
  if(providerState?.status!=="active"&&!testAllowed)return json({error:"provider_not_active",provider_key:"telnyx",channel:job.channel},503,origin);

  let bindingQuery=svc.from("channel_provider_bindings").select("*").eq("organization_id",job.organization_id).eq("channel",job.channel).eq("provider_key","telnyx").eq("status","connected").eq("outbound_enabled",true);
  if(job.connection_id)bindingQuery=bindingQuery.eq("connection_id",job.connection_id);
  const {data:bindings}=await bindingQuery.order("is_primary",{ascending:false}).limit(1);
  const binding=bindings?.[0];
  if(!binding)return json({error:"telnyx_sender_binding_missing",channel:job.channel},409,origin);
  const connectionId=String(binding.connection_id||job.connection_id||"");
  if(!connectionId)return json({error:"telnyx_connection_missing"},409,origin);
  const {data:secretRow}=await svc.from("connection_secrets").select("access_token_secret_id").eq("connection_id",connectionId).maybeSingle();
  if(!secretRow?.access_token_secret_id)return json({error:"telnyx_api_key_missing"},503,origin);
  const {data:apiKey}=await svc.rpc("service_read_secret",{p_secret_id:secretRow.access_token_secret_id});
  if(!apiKey)return json({error:"telnyx_api_key_unavailable"},503,origin);
  const sender=normalizePhone(binding.provider_channel_id);
  if(!sender)return json({error:"telnyx_sender_invalid"},409,origin);

  let payload:any;
  let endpoint:string;
  if(job.channel==="sms"){
    endpoint="/messages";
    payload={from:sender,to:recipient,text:String(job.body||"")};
    const profileId=String(binding.metadata?.messaging_profile_id||"");if(profileId)payload.messaging_profile_id=profileId;
    if(Array.isArray(job.media)&&job.media.length){payload.media_urls=job.media.map((m:any)=>typeof m==="string"?m:m?.url).filter(Boolean).slice(0,10);}
  }else{
    endpoint="/messages/whatsapp";
    if(job.template_key){payload={from:sender,to:recipient,whatsapp_message:{type:"template",template:{name:String(job.template_key),language:{policy:"deterministic",code:String(job.metadata?.language||"en_US")},components:Array.isArray(job.metadata?.template_components)?job.metadata.template_components:[]}}};}
    else if(Array.isArray(job.media)&&job.media.length){const m=job.media[0];const url=typeof m==="string"?m:String(m?.url||"");const type=String((typeof m==="object"&&m?.type)||"image");payload={from:sender,to:recipient,whatsapp_message:{type,[type]:{link:url,caption:job.body?String(job.body):undefined}}};}
    else payload={from:sender,to:recipient,whatsapp_message:{type:"text",text:{body:String(job.body||""),preview_url:false}}};
  }
  await svc.from("communications_engine_jobs").update({status:"sending",attempts:Number(job.attempts||0)+1,provider_key:"telnyx",connection_id:connectionId,last_error:null}).eq("id",job.id);
  const result=await telnyxFetch<any>(String(apiKey),endpoint,{method:"POST",body:JSON.stringify(payload)});
  if(!result.ok){const errorText=result.text.slice(0,1200);await svc.from("communications_engine_jobs").update({status:"failed",last_error:`telnyx_${result.status}:${errorText}`}).eq("id",job.id);await svc.from("communications_engine_events").insert({job_id:job.id,organization_id:job.organization_id,provider_key:"telnyx",channel:job.channel,event_type:"send.failed",occurred_at:new Date().toISOString(),payload:{status:result.status,error:errorText}});return json({error:"telnyx_send_failed",status:result.status},502,origin);}
  const messageId=String(result.data?.data?.id||result.data?.id||"");
  const now=new Date().toISOString();
  await svc.from("communications_engine_jobs").update({status:"sent",provider_message_id:messageId||null,sent_at:now,last_error:null}).eq("id",job.id);
  await svc.from("communications_engine_events").insert({job_id:job.id,organization_id:job.organization_id,provider_key:"telnyx",channel:job.channel,provider_message_id:messageId||null,event_type:"send.accepted",occurred_at:now,payload:{test_mode:testAllowed}});
  const conversationExternal=`${job.channel}:${sender}:${recipient}`;
  const {data:conversation}=await svc.from("universal_conversations").upsert({organization_id:job.organization_id,contact_id:job.contact_id||null,source_provider:"telnyx",external_conversation_id:conversationExternal,primary_channel:job.channel,status:"open",last_message_at:now,last_message_preview:String(job.body||"").slice(0,300),metadata:{connection_id:connectionId,sender}}, {onConflict:"organization_id,source_provider,external_conversation_id"}).select("id").single();
  if(conversation?.id&&messageId){await svc.from("universal_messages").upsert({organization_id:job.organization_id,conversation_id:conversation.id,contact_id:job.contact_id||null,source_provider:"telnyx",external_message_id:messageId,direction:"outbound",channel:job.channel,message_type:job.template_key?"template":"text",body:job.body||null,attachments:job.media||[],status:"sent",sender_identifier:sender,recipient_identifier:recipient,occurred_at:now,metadata:{job_id:job.id,connection_id:connectionId}}, {onConflict:"organization_id,source_provider,external_message_id"});}
  return json({ok:true,job_id:job.id,provider_key:"telnyx",channel:job.channel,provider_message_id:messageId,test_mode:testAllowed},200,origin);
});
