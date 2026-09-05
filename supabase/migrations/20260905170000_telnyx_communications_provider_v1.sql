-- CloudSales Communications Engine: Telnyx provider registration.
-- Production-safe: provider remains inactive and routes disabled until credentials + signed webhook + live E2E pass.
begin;

insert into public.provider_catalog(provider_key,display_name,category,auth_type,availability,sort_order,metadata)
values (
  'telnyx','Telnyx','messaging','api_key','planned',205,
  jsonb_build_object(
    'ui_section','messaging',
    'connection_center',true,
    'provider_type','carrier_cpaas',
    'channels',jsonb_build_array('sms','mms','whatsapp','voice','whatsapp_calling','rcs'),
    'agent_native_signup',true,
    'agent_signup_url','https://telnyx.com/agent-signup.md',
    'whatsapp_onboarding_mode','telnyx_meta_embedded_signup',
    'api_base','https://api.telnyx.com/v2',
    'cloudsales_managed_connection',true,
    'byo_credentials_supported',true,
    'requires_live_e2e_before_active',true
  )
)
on conflict(provider_key) do update set
  display_name=excluded.display_name,
  category=excluded.category,
  auth_type=excluded.auth_type,
  availability=excluded.availability,
  sort_order=excluded.sort_order,
  metadata=public.provider_catalog.metadata||excluded.metadata,
  updated_at=now();

insert into public.provider_capabilities(provider_key,capability_key,support_status,write_capable,requires_provider_review,notes,metadata)
values
 ('telnyx','sms.send','planned',true,true,'Send SMS/MMS through Telnyx Messaging API.',jsonb_build_object('endpoint','POST /v2/messages','e2e_required',true)),
 ('telnyx','sms.receive','planned',false,true,'Receive SMS/MMS through signed Telnyx webhooks.',jsonb_build_object('event','message.received','signature','ed25519','e2e_required',true)),
 ('telnyx','whatsapp.connect.start','planned',true,true,'Start Telnyx-hosted Meta Embedded Signup for WhatsApp Business.',jsonb_build_object('onboarding_mode','telnyx_meta_embedded_signup','e2e_required',true)),
 ('telnyx','whatsapp.connect.complete','planned',true,true,'Complete Telnyx WhatsApp sender/WABA binding.',jsonb_build_object('onboarding_mode','telnyx_meta_embedded_signup','e2e_required',true)),
 ('telnyx','whatsapp.send','planned',true,true,'Send WhatsApp messages through Telnyx.',jsonb_build_object('endpoint','POST /v2/messages/whatsapp','e2e_required',true)),
 ('telnyx','whatsapp.receive','planned',false,true,'Receive WhatsApp messages through signed Telnyx webhooks.',jsonb_build_object('signature','ed25519','e2e_required',true)),
 ('telnyx','whatsapp.template.send','planned',true,true,'Send Meta-approved WhatsApp templates through Telnyx.',jsonb_build_object('endpoint','POST /v2/messages/whatsapp','e2e_required',true)),
 ('telnyx','whatsapp.media.send','planned',true,true,'Send supported WhatsApp media through Telnyx.',jsonb_build_object('endpoint','POST /v2/messages/whatsapp','e2e_required',true)),
 ('telnyx','message.status','planned',false,true,'Normalize Telnyx delivery lifecycle webhooks.',jsonb_build_object('events',jsonb_build_array('message.sent','message.finalized'),'e2e_required',true)),
 ('telnyx','message.thread.read','planned',false,true,'Read normalized CloudSales conversation thread.',jsonb_build_object('canonical_store','universal_messages')),
 ('telnyx','message.thread.reply','planned',true,true,'Reply through the CloudSales communications queue using Telnyx.',jsonb_build_object('canonical_queue','communications_engine_jobs','e2e_required',true))
on conflict(provider_key,capability_key) do update set
 support_status=excluded.support_status,
 write_capable=excluded.write_capable,
 requires_provider_review=excluded.requires_provider_review,
 notes=excluded.notes,
 metadata=public.provider_capabilities.metadata||excluded.metadata,
 updated_at=now();

insert into public.communications_engine_providers(provider_key,channel,priority,status,cost_model,capabilities,config)
values
 ('telnyx','sms',10,'inactive',jsonb_build_object('model','telnyx_usage','refresh_before_routing',true),array['sms.send','sms.receive','message.status']::text[],jsonb_build_object('api_base','https://api.telnyx.com/v2','send_endpoint','/messages','requires_live_e2e_before_active',true)),
 ('telnyx','whatsapp',15,'inactive',jsonb_build_object('model','telnyx_plus_meta','refresh_before_routing',true),array['whatsapp.connect.start','whatsapp.connect.complete','whatsapp.send','whatsapp.receive','whatsapp.template.send','whatsapp.media.send','message.status']::text[],jsonb_build_object('api_base','https://api.telnyx.com/v2','send_endpoint','/messages/whatsapp','requires_live_e2e_before_active',true))
on conflict(provider_key,channel) do update set
 priority=excluded.priority,
 cost_model=excluded.cost_model,
 capabilities=excluded.capabilities,
 config=public.communications_engine_providers.config||excluded.config,
 updated_at=now();

insert into public.integration_provider_routes(capability_key,provider_key,route_type,priority,enabled,minimum_support_status,quality_weight,cost_weight,latency_weight,metadata)
values
 ('sms.send','telnyx','direct',10,false,'beta',1,1,1,jsonb_build_object('activation_gate','telnyx_sms_e2e_passed')),
 ('whatsapp.connect.start','telnyx','aggregator',15,false,'beta',1,1,1,jsonb_build_object('activation_gate','telnyx_whatsapp_e2e_passed','onboarding_mode','telnyx_meta_embedded_signup')),
 ('whatsapp.send','telnyx','aggregator',15,false,'beta',1,1,1,jsonb_build_object('activation_gate','telnyx_whatsapp_e2e_passed'))
on conflict(capability_key,provider_key) do update set
 route_type=excluded.route_type,
 priority=excluded.priority,
 enabled=excluded.enabled,
 minimum_support_status=excluded.minimum_support_status,
 metadata=public.integration_provider_routes.metadata||excluded.metadata,
 updated_at=now();

insert into public.communications_engine_webhooks(provider_key,channel,endpoint,status,events,metadata)
values
 ('telnyx','sms','https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/connection-secret-setup','pending',array['message.received','message.sent','message.finalized']::text[],jsonb_build_object('signature','ed25519','timestamp_tolerance_seconds',300,'runtime_consolidated',true,'handler','connection-secret-setup')),
 ('telnyx','whatsapp','https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/connection-secret-setup','pending',array['message.received','message.sent','message.finalized']::text[],jsonb_build_object('signature','ed25519','timestamp_tolerance_seconds',300,'runtime_consolidated',true,'handler','connection-secret-setup'))
on conflict(provider_key,channel) do update set
 endpoint=excluded.endpoint,
 events=excluded.events,
 metadata=public.communications_engine_webhooks.metadata||excluded.metadata,
 updated_at=now();

insert into public.integration_readiness(provider_key,phase,priority,status,owner,required_items,next_action,notes)
values(
 'telnyx',3,'critical','in_progress','shared',
 jsonb_build_array('Telnyx account/API key','Telnyx webhook public key','messaging profile + number','signed webhook verification','SMS live E2E','Meta/WABA Embedded Signup','WhatsApp live E2E'),
 'Configure Telnyx credentials, bind a sender, verify signed webhook delivery, then run SMS and WhatsApp E2E before enabling routing.',
 'Adapter is provider-agnostic and remains disabled until live tests pass.'
)
on conflict(provider_key) do update set
 phase=excluded.phase,priority=excluded.priority,status=excluded.status,owner=excluded.owner,
 required_items=excluded.required_items,next_action=excluded.next_action,notes=excluded.notes,updated_at=now();

create unique index if not exists communications_engine_events_provider_event_uidx
on public.communications_engine_events(provider_key,provider_event_id)
where provider_event_id is not null;

commit;
