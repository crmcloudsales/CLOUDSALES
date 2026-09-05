-- CloudSales Telnyx: promote Voice to a first-class communications channel.
-- Production-safe: Voice remains inactive and its route disabled until live E2E passes.
begin;

alter table public.communications_engine_providers
  drop constraint if exists communications_engine_providers_channel_check;

alter table public.communications_engine_providers
  add constraint communications_engine_providers_channel_check
  check (channel = any (array['whatsapp'::text,'sms'::text,'voice'::text]));

insert into public.provider_capabilities(provider_key,capability_key,support_status,write_capable,requires_provider_review,notes,metadata)
values
 ('telnyx','voice.call.start','planned',true,true,'Start programmable voice calls through Telnyx Voice API after Call Control setup.',jsonb_build_object('endpoint','POST /v2/calls','e2e_required',true)),
 ('telnyx','voice.call.receive','planned',false,true,'Receive and normalize Telnyx voice webhooks.',jsonb_build_object('signature','ed25519','e2e_required',true))
on conflict(provider_key,capability_key) do update set
 support_status=excluded.support_status,
 write_capable=excluded.write_capable,
 requires_provider_review=excluded.requires_provider_review,
 notes=excluded.notes,
 metadata=public.provider_capabilities.metadata||excluded.metadata,
 updated_at=now();

insert into public.communications_engine_providers(provider_key,channel,priority,status,cost_model,capabilities,config)
values (
 'telnyx','voice',20,'inactive',
 jsonb_build_object('model','telnyx_usage','refresh_before_routing',true),
 array['voice.call.start','voice.call.receive']::text[],
 jsonb_build_object('api_base','https://api.telnyx.com/v2','requires_call_control_application',true,'requires_outbound_voice_profile',true,'requires_live_e2e_before_active',true)
)
on conflict(provider_key,channel) do update set
 priority=excluded.priority,
 cost_model=excluded.cost_model,
 capabilities=excluded.capabilities,
 config=public.communications_engine_providers.config||excluded.config,
 updated_at=now();

insert into public.integration_provider_routes(capability_key,provider_key,route_type,priority,enabled,minimum_support_status,quality_weight,cost_weight,latency_weight,metadata)
values ('voice.call.start','telnyx','direct',20,false,'beta',1,1,1,jsonb_build_object('activation_gate','telnyx_voice_e2e_passed'))
on conflict(capability_key,provider_key) do update set
 route_type=excluded.route_type,
 priority=excluded.priority,
 enabled=excluded.enabled,
 minimum_support_status=excluded.minimum_support_status,
 metadata=public.integration_provider_routes.metadata||excluded.metadata,
 updated_at=now();

update public.integration_readiness
set required_items=coalesce(required_items,'[]'::jsonb)||jsonb_build_array('Call Control application','Outbound Voice Profile','Voice live E2E'),
    next_action='Connect Telnyx credentials, refresh provider state, finish Meta Embedded Signup for WhatsApp, and pass SMS/WhatsApp/Voice E2E before enabling routes.',
    updated_at=now()
where provider_key='telnyx';

commit;
