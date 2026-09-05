-- Normalize signed Telnyx SMS/WhatsApp events into CloudSales universal Inbox.
begin;

create or replace function public.cloudsales_normalize_telnyx_phone(v jsonb)
returns text
language plpgsql
immutable
as $$
declare raw text; digits text;
begin
  if v is null then return ''; end if;
  if jsonb_typeof(v)='object' then
    raw := coalesce(v->>'phone_number',v->>'phoneNumber',v->>'number','');
  elsif jsonb_typeof(v)='string' then
    raw := v #>> '{}';
  else raw := '';
  end if;
  digits := regexp_replace(coalesce(raw,''),'\D','','g');
  if digits='' then return ''; end if;
  return '+'||digits;
end;
$$;

create or replace function public.cloudsales_telnyx_event_to_inbox()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p jsonb := coalesce(new.payload,'{}'::jsonb);
  dir text := lower(coalesce(p->>'direction',''));
  from_phone text; to_phone text; own_phone text; remote_phone text;
  provider_status text; normalized_status text;
  connection uuid; contact uuid; job uuid; conv uuid;
  ext_conv text; msg_body text; msg_type text; media jsonb := '[]'::jsonb;
begin
  if new.provider_key <> 'telnyx' or new.channel not in ('sms','whatsapp') then return new; end if;
  from_phone := public.cloudsales_normalize_telnyx_phone(p->'from');
  if jsonb_typeof(p->'to')='array' then
    to_phone := public.cloudsales_normalize_telnyx_phone((p->'to')->0);
    provider_status := coalesce((p->'to')->0->>'status',p->>'status','');
  else
    to_phone := public.cloudsales_normalize_telnyx_phone(p->'to');
    provider_status := coalesce(p->>'status','');
  end if;
  if dir='' then dir := case when new.event_type='message.received' then 'inbound' else 'outbound' end; end if;
  own_phone := case when dir='inbound' then to_phone else from_phone end;
  remote_phone := case when dir='inbound' then from_phone else to_phone end;

  select b.connection_id into connection from public.channel_provider_bindings b
   where b.organization_id=new.organization_id and b.provider_key='telnyx' and b.channel=new.channel
     and b.provider_channel_id=own_phone and b.status<>'disabled'
   order by b.is_primary desc,b.created_at limit 1;
  if remote_phone<>'' then select c.id into contact from public.contacts c where c.organization_id=new.organization_id and c.phone_e164=remote_phone limit 1; end if;
  if new.provider_message_id is not null then select j.id into job from public.communications_engine_jobs j where j.provider_key='telnyx' and j.provider_message_id=new.provider_message_id order by j.created_at desc limit 1; end if;

  normalized_status := case
    when new.event_type='message.sent' then 'sent'
    when new.event_type='message.delivered' then 'delivered'
    when new.event_type='message.read' then 'read'
    when new.event_type='message.failed' then 'failed'
    when new.event_type='message.finalized' and lower(provider_status) in ('delivered','delivery_success','sent') then 'delivered'
    when new.event_type='message.finalized' and lower(provider_status) in ('delivery_failed','failed','undelivered','rejected') then 'failed'
    else null end;

  if job is not null then
    update public.communications_engine_events set job_id=job where id=new.id and job_id is null;
    if normalized_status is not null then
      update public.communications_engine_jobs
      set status=normalized_status,
          delivered_at=case when normalized_status='delivered' then new.occurred_at else delivered_at end,
          read_at=case when normalized_status='read' then new.occurred_at else read_at end,
          last_error=case when normalized_status='failed' then 'telnyx_delivery_failed:'||provider_status else last_error end,
          updated_at=now()
      where id=job;
    end if;
  end if;
  if own_phone='' or remote_phone='' or new.provider_message_id is null then return new; end if;

  msg_body := coalesce(p->>'text',p->>'body',p#>>'{whatsapp_message,text,body}','');
  msg_type := lower(coalesce(p->>'type','text'));
  if jsonb_typeof(p->'media')='array' then media:=p->'media'; end if;
  ext_conv := new.channel||':'||own_phone||':'||remote_phone;

  insert into public.universal_conversations(organization_id,contact_id,source_provider,external_conversation_id,primary_channel,status,unread_count,last_message_at,last_message_preview,metadata)
  values(new.organization_id,contact,'telnyx',ext_conv,new.channel,'open',case when dir='inbound' and new.event_type='message.received' then 1 else 0 end,new.occurred_at,left(msg_body,500),jsonb_build_object('connection_id',connection,'sender',own_phone))
  on conflict(organization_id,source_provider,external_conversation_id) do update set
    contact_id=coalesce(universal_conversations.contact_id,excluded.contact_id),primary_channel=excluded.primary_channel,status='open',
    unread_count=universal_conversations.unread_count + case when dir='inbound' and new.event_type='message.received' then 1 else 0 end,
    last_message_at=greatest(coalesce(universal_conversations.last_message_at,excluded.last_message_at),excluded.last_message_at),
    last_message_preview=case when excluded.last_message_at>=coalesce(universal_conversations.last_message_at,'epoch'::timestamptz) then excluded.last_message_preview else universal_conversations.last_message_preview end,
    metadata=coalesce(universal_conversations.metadata,'{}'::jsonb)||excluded.metadata,updated_at=now()
  returning id into conv;

  insert into public.universal_messages(organization_id,conversation_id,contact_id,source_provider,external_message_id,direction,channel,message_type,body,attachments,status,sender_identifier,recipient_identifier,occurred_at,metadata)
  values(new.organization_id,conv,contact,'telnyx',new.provider_message_id,case when dir='inbound' then 'inbound' else 'outbound' end,new.channel,msg_type,nullif(msg_body,''),media,coalesce(normalized_status,nullif(provider_status,'')),case when dir='inbound' then remote_phone else own_phone end,case when dir='inbound' then own_phone else remote_phone end,new.occurred_at,jsonb_build_object('provider_event_id',new.provider_event_id,'connection_id',connection))
  on conflict(organization_id,source_provider,external_message_id) do update set
    conversation_id=excluded.conversation_id,contact_id=coalesce(universal_messages.contact_id,excluded.contact_id),body=coalesce(excluded.body,universal_messages.body),
    attachments=case when excluded.attachments<>'[]'::jsonb then excluded.attachments else universal_messages.attachments end,
    status=coalesce(excluded.status,universal_messages.status),occurred_at=least(universal_messages.occurred_at,excluded.occurred_at),
    metadata=coalesce(universal_messages.metadata,'{}'::jsonb)||excluded.metadata,updated_at=now();
  return new;
end;
$$;

drop trigger if exists trg_cloudsales_telnyx_event_to_inbox on public.communications_engine_events;
create trigger trg_cloudsales_telnyx_event_to_inbox after insert on public.communications_engine_events
for each row when (new.provider_key='telnyx') execute function public.cloudsales_telnyx_event_to_inbox();

update public.communications_engine_webhooks
set events=array['message.received','message.sent','message.finalized','message.delivered','message.read','message.failed']::text[],updated_at=now()
where provider_key='telnyx' and channel='whatsapp';

commit;
