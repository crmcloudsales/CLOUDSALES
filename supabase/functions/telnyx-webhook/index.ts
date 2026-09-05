import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizePhone, telnyxJobStatus, telnyxMessageFacts, verifyTelnyxWebhook, type TelnyxEventEnvelope } from "../_shared/telnyx.ts";

const U=Deno.env.get("SUPABASE_URL")!;
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
function json(b:unknown,s=200){return new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store"}})}

Deno.serve(async(req)=>{
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const raw=await req.text();
  let envelope:TelnyxEventEnvelope;try{envelope=JSON.parse(raw)}catch{return json({error:"invalid_json"},400)}
  const facts=telnyxMessageFacts(envelope);
  if(!facts.eventId||!facts.messageId)return json({error:"invalid_telnyx_event"},400);
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});

  const {data:duplicate}=await svc.from("communications_engine_events").select("id").eq("provider_key","telnyx").eq("provider_event_id",facts.eventId).maybeSingle();
  if(duplicate)return json({ok:true,duplicate:true},200);

  let organizationId:string|null=null,connectionId:string|null=null,contactId:string|null=null;
  if(facts.direction==="outbound"){
    const {data:job}=await svc.from("communications_engine_jobs").select("id,organization_id,connection_id,contact_id").eq("provider_key","telnyx").eq("provider_message_id",facts.messageId).limit(1).maybeSingle();
    if(job){organizationId=job.organization_id;connectionId=job.connection_id;contactId=job.contact_id;}
  }
  if(!connectionId&&facts.ownNumber){
    const {data:binding}=await svc.from("channel_provider_bindings").select("organization_id,connection_id").eq("provider_key","telnyx").eq("channel",facts.channel).eq("provider_channel_id",facts.ownNumber).neq("status","disabled").limit(1).maybeSingle();
    if(binding){organizationId=binding.organization_id;connectionId=binding.connection_id;}
  }
  if(!organizationId||!connectionId)return json({error:"unmapped_telnyx_sender"},404);

  const {data:secretRow}=await svc.from("connection_secrets").select("webhook_secret_secret_id").eq("connection_id",connectionId).maybeSingle();
  if(!secretRow?.webhook_secret_secret_id)return json({error:"webhook_public_key_not_configured"},503);
  const {data:publicKey}=await svc.rpc("service_read_secret",{p_secret_id:secretRow.webhook_secret_secret_id});
  if(!publicKey)return json({error:"webhook_public_key_unavailable"},503);
  const verified=await verifyTelnyxWebhook(raw,req.headers.get("telnyx-signature-ed25519"),req.headers.get("telnyx-timestamp"),String(publicKey),300);
  if(!verified){await svc.from("audit_log").insert({organization_id:organizationId,actor_type:"system",action:"communications.telnyx.webhook_signature_failed",entity_type:"connection",entity_id:connectionId,connection_id:connectionId,success:false,context:{event_id:facts.eventId,event_type:facts.eventType}});return json({error:"invalid_signature"},403);}

  if(!contactId&&facts.remoteNumber){const {data:c}=await svc.from("contacts").select("id").eq("organization_id",organizationId).eq("phone_e164",facts.remoteNumber).limit(1).maybeSingle();contactId=c?.id||null;}
  const {data:event,error:eventError}=await svc.from("communications_engine_events").insert({organization_id:organizationId,provider_key:"telnyx",channel:facts.channel,provider_event_id:facts.eventId,provider_message_id:facts.messageId,event_type:facts.eventType,occurred_at:facts.occurredAt,payload:facts.payload}).select("id").single();
  if(eventError){if(String(eventError.code)==="23505")return json({ok:true,duplicate:true},200);return json({error:"event_persist_failed"},500);}

  const status=telnyxJobStatus(facts.eventType,facts.statusRaw);
  const {data:job}=await svc.from("communications_engine_jobs").select("id,status,metadata,contact_id").eq("provider_key","telnyx").eq("provider_message_id",facts.messageId).limit(1).maybeSingle();
  if(job){
    const patch:any={};
    if(status)patch.status=status;
    if(status==="delivered")patch.delivered_at=facts.occurredAt;
    if(status==="read")patch.read_at=facts.occurredAt;
    if(status==="failed")patch.last_error=`telnyx_delivery_failed:${facts.statusRaw}`;
    if(Object.keys(patch).length)await svc.from("communications_engine_jobs").update(patch).eq("id",job.id);
    await svc.from("communications_engine_events").update({job_id:job.id}).eq("id",event.id);
    if(!contactId&&job.contact_id)contactId=job.contact_id;
  }

  const conversationExternal=`${facts.channel}:${facts.ownNumber}:${facts.remoteNumber}`;
  const preview=facts.text.slice(0,300);
  const {data:conversation}=await svc.from("universal_conversations").upsert({organization_id:organizationId,contact_id:contactId,source_provider:"telnyx",external_conversation_id:conversationExternal,primary_channel:facts.channel,status:"open",last_message_at:facts.occurredAt,last_message_preview:preview,metadata:{connection_id:connectionId,sender:facts.ownNumber}}, {onConflict:"organization_id,source_provider,external_conversation_id"}).select("id,unread_count").single();
  if(conversation?.id){
    await svc.from("universal_messages").upsert({organization_id:organizationId,conversation_id:conversation.id,contact_id:contactId,source_provider:"telnyx",external_message_id:facts.messageId,direction:facts.direction==="inbound"?"inbound":"outbound",channel:facts.channel,message_type:String(facts.payload.type||"text").toLowerCase(),body:facts.text||null,attachments:facts.media,status:status||facts.statusRaw||null,sender_identifier:facts.direction==="inbound"?facts.remoteNumber:facts.ownNumber,recipient_identifier:facts.direction==="inbound"?facts.ownNumber:facts.remoteNumber,occurred_at:facts.occurredAt,metadata:{provider_event_id:facts.eventId,connection_id:connectionId}}, {onConflict:"organization_id,source_provider,external_message_id"});
    if(facts.direction==="inbound")await svc.from("universal_conversations").update({unread_count:Number(conversation.unread_count||0)+1,last_message_at:facts.occurredAt,last_message_preview:preview}).eq("id",conversation.id);
  }

  if(facts.direction==="inbound"&&facts.channel==="sms"){
    const keyword=facts.text.trim().toUpperCase();
    if(["STOP","STOPALL","UNSUBSCRIBE","CANCEL","END","QUIT"].includes(keyword)){
      const phone=normalizePhone(facts.remoteNumber);
      const {data:existingSuppression}=await svc.from("contact_suppressions").select("id").eq("organization_id",organizationId).eq("phone_normalized",phone).eq("active",true).limit(1).maybeSingle();
      const suppressionPayload={contact_id:contactId,phone_normalized:phone,reason:"sms_opt_out",active:true,metadata:{provider:"telnyx",event_id:facts.eventId,keyword}};
      let suppressionError:any=null;
      if(existingSuppression?.id){const {error}=await svc.from("contact_suppressions").update(suppressionPayload).eq("id",existingSuppression.id);suppressionError=error;}
      else{const {error}=await svc.from("contact_suppressions").insert({organization_id:organizationId,...suppressionPayload});suppressionError=error;}
      await svc.from("audit_log").insert({organization_id:organizationId,actor_type:"system",action:suppressionError?"communications.sms.opt_out_failed":"communications.sms.opt_out",entity_type:"contact",entity_id:contactId,connection_id:connectionId,success:!suppressionError,context:{phone,provider:"telnyx",keyword,error:suppressionError?.message||null}});
    }
  }

  await svc.from("communications_engine_providers").update({last_health_at:new Date().toISOString()}).eq("provider_key","telnyx").eq("channel",facts.channel);
  return json({ok:true,event_id:facts.eventId,event_type:facts.eventType},200);
});
