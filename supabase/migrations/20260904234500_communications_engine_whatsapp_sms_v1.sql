-- CloudSales Communications Engine v1: WhatsApp + SMS provider router.
-- Live migration applied 2026-09-04. Provider support remains capability-gated until live E2E passes.
create table if not exists public.communications_engine_providers (
  provider_key text not null references public.provider_catalog(provider_key) on delete cascade,
  channel text not null check (channel in ('whatsapp','sms')),
  priority integer not null default 100,
  status text not null default 'inactive' check (status in ('inactive','active','degraded','blocked','disabled')),
  cost_model jsonb not null default '{}'::jsonb,
  capabilities text[] not null default '{}',
  secret_setting_key text,
  config jsonb not null default '{}'::jsonb,
  last_health_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (provider_key, channel)
);
alter table public.communications_engine_providers enable row level security;
comment on table public.communications_engine_providers is 'CloudSales provider router for WhatsApp and SMS, modeled after Email Engine. Cost and capability data are inputs to routing, not hardcoded provider lock-in.';

create table if not exists public.communications_engine_jobs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null, channel text not null check (channel in ('whatsapp','sms')),
  purpose text not null, recipient text not null, body text, template_key text, media jsonb not null default '[]'::jsonb,
  idempotency_key text not null unique,
  authorization_mode text not null default 'policy' check (authorization_mode in ('policy','explicit_user','consent','system_transactional','recurring_operational')),
  authorization_ref text, provider_key text, connection_id uuid references public.connections(id) on delete set null,
  provider_message_id text, status text not null default 'queued' check (status in ('queued','sending','sent','delivered','read','replied','failed','suppressed','cancelled')),
  attempts integer not null default 0, last_error text, scheduled_at timestamptz not null default now(), sent_at timestamptz, delivered_at timestamptz, read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.communications_engine_jobs enable row level security;
create index if not exists communications_engine_jobs_org_status_idx on public.communications_engine_jobs(organization_id,status,scheduled_at);
comment on table public.communications_engine_jobs is 'Canonical outbound WhatsApp/SMS queue. Conversation transcript remains canonical in universal_conversations/universal_messages.';

create table if not exists public.communications_engine_events (
  id uuid primary key default gen_random_uuid(), job_id uuid references public.communications_engine_jobs(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade, provider_key text not null, channel text not null check (channel in ('whatsapp','sms')),
  provider_event_id text, provider_message_id text, event_type text not null, occurred_at timestamptz not null default now(), payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.communications_engine_events enable row level security;
create index if not exists communications_engine_events_message_idx on public.communications_engine_events(provider_key,provider_message_id,occurred_at);
comment on table public.communications_engine_events is 'Normalized WhatsApp/SMS delivery, read, reply, inbound and provider lifecycle events.';

create table if not exists public.communications_engine_webhooks (
  provider_key text not null, channel text not null check (channel in ('whatsapp','sms')), endpoint text not null, signing_secret_id uuid,
  status text not null default 'pending' check (status in ('pending','active','disabled','failed')), events text[] not null default '{}', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(provider_key,channel)
);
alter table public.communications_engine_webhooks enable row level security;
comment on table public.communications_engine_webhooks is 'Inbound provider webhook registry for CloudSales WhatsApp/SMS engine.';

insert into public.communications_engine_providers(provider_key,channel,priority,status,cost_model,capabilities,config)
select p.provider_key,'whatsapp',case p.provider_key when 'meta_whatsapp' then 10 when 'gupshup_whatsapp' then 20 when 'infobip_whatsapp' then 30 when 'vonage_whatsapp' then 40 when 'twilio_whatsapp' then 50 else 100 end,
'inactive',jsonb_build_object('model',case when p.provider_key='meta_whatsapp' then 'meta_direct_pass_through' else 'provider_markup_plus_meta' end,'observed_at','2026-09-04','refresh_before_routing',true),
array['whatsapp.connect.start','whatsapp.connect.complete','whatsapp.send','whatsapp.receive','whatsapp.template.send','whatsapp.media.send']::text[],
jsonb_build_object('router_policy','capability_then_landed_cost_then_quality_then_latency','requires_live_e2e_before_active',true)
from public.provider_catalog p where p.provider_key in ('meta_whatsapp','gupshup_whatsapp','infobip_whatsapp','vonage_whatsapp','twilio_whatsapp')
on conflict(provider_key,channel) do update set priority=excluded.priority,cost_model=excluded.cost_model,capabilities=excluded.capabilities,config=excluded.config,updated_at=now();

insert into public.provider_capabilities(provider_key,capability_key,support_status,write_capable,requires_provider_review,notes,metadata) values
('infobip_whatsapp','whatsapp.coexistence.app_active','planned',false,true,'Provider docs support Business App + Cloud API on the same number; production enablement still requires onboarding/E2E.',jsonb_build_object('verified_on','2026-09-04','source','infobip_docs')),
('infobip_whatsapp','whatsapp.coexistence.message_echo','planned',false,true,'Post-onboarding messages are delivered by webhook; exact two-way transcript behavior must be E2E tested.',jsonb_build_object('verified_on','2026-09-04','source','infobip_docs')),
('infobip_whatsapp','whatsapp.coexistence.history_sync','unsupported',false,true,'Current onboarding docs say chat history is not transferred and chat sharing must be disabled.',jsonb_build_object('verified_on','2026-09-04','source','infobip_docs')),
('infobip_whatsapp','whatsapp.coexistence.contact_sync','unsupported',false,true,'Current onboarding docs say Business App contacts are not synchronized.',jsonb_build_object('verified_on','2026-09-04','source','infobip_docs')),
('infobip_whatsapp','whatsapp.coexistence.catalog_preserved','planned',false,true,'Provider Q1 2026 update says catalog and labels remain intact.',jsonb_build_object('verified_on','2026-09-04','source','infobip_product_update')),
('infobip_whatsapp','whatsapp.coexistence.voice_calls_preserved','planned',false,true,'Provider Q1 2026 update says Business App voice calls keep working.',jsonb_build_object('verified_on','2026-09-04','source','infobip_product_update')),
('gupshup_whatsapp','whatsapp.coexistence.app_active','planned',false,true,'Provider docs support Business App coexistence; CloudSales must E2E validate before production.',jsonb_build_object('verified_on','2026-09-04','source','gupshup_docs')),
('gupshup_whatsapp','whatsapp.coexistence.message_echo','planned',false,true,'Provider documents coexistence/history synchronization but event consistency requires E2E verification.',jsonb_build_object('verified_on','2026-09-04','source','gupshup_docs')),
('gupshup_whatsapp','whatsapp.coexistence.history_sync','planned',false,true,'Provider documents synchronized history; do not promote as guaranteed until CloudSales E2E passes.',jsonb_build_object('verified_on','2026-09-04','source','gupshup_docs')),
('twilio_whatsapp','whatsapp.coexistence.app_active','unsupported',false,true,'Current Twilio migration docs say a migrated Business App number cannot continue using the app on the same number.',jsonb_build_object('verified_on','2026-09-04','source','twilio_docs')),
('vonage_whatsapp','whatsapp.coexistence.app_active','unsupported',false,true,'Current Vonage docs say a number integrated with the API cannot be used in the mobile client app.',jsonb_build_object('verified_on','2026-09-04','source','vonage_docs'))
on conflict(provider_key,capability_key) do update set support_status=excluded.support_status,write_capable=excluded.write_capable,requires_provider_review=excluded.requires_provider_review,notes=excluded.notes,metadata=excluded.metadata,updated_at=now();

insert into public.onboarding_checklist_items(item_key,phase,sort_order,title,automation_target,blocking,verification)
values('connect_whatsapp_business_coexistence',3,35,'Connect WhatsApp Business','communications_engine.whatsapp.connect',false,jsonb_build_object('required_capability','whatsapp.coexistence.app_active','success','active organization WhatsApp identity with connected provider and verified inbound/outbound test'))
on conflict(item_key) do update set title=excluded.title,automation_target=excluded.automation_target,blocking=excluded.blocking,verification=excluded.verification,updated_at=now();

insert into public.organization_onboarding_progress(organization_id,item_key,status,details)
select id,'connect_whatsapp_business_coexistence','pending',jsonb_build_object('prompt','Ya puedes agregar tu número de WhatsApp Business','dismissible',true,'coexistence_required',true,'preferred_candidates',jsonb_build_array('gupshup_whatsapp','infobip_whatsapp','meta_whatsapp'),'created_for','pennyworth_pilot') from public.organizations where slug='pennyworth'
on conflict(organization_id,item_key) do update set details=excluded.details,updated_at=now();

insert into public.integration_readiness(provider_key,phase,priority,status,owner,required_items,next_action,notes) values
('gupshup_whatsapp',3,'critical','in_progress','shared',jsonb_build_array('provider credentials','embedded signup/partner authorization','webhook verification','Pennyworth coexistence E2E'),'Run Pennyworth coexistence pilot after secure provider credentials are configured.','Candidate #1; keep inactive until live E2E proves same-number app + CloudSales behavior.'),
('infobip_whatsapp',3,'critical','in_progress','shared',jsonb_build_array('provider credentials','embedded signup authorization','webhook verification','Pennyworth coexistence E2E'),'Run Pennyworth coexistence pilot and verify exact message echo semantics.','Candidate #2; app coexistence documented, but current docs do not support history import/contact sync.'),
('meta_whatsapp',3,'high','blocked_provider_review','shared',jsonb_build_array('Meta Tech Provider enrollment','Meta app','Embedded Signup configuration','whatsapp_business_management','whatsapp_business_messaging','webhooks'),'Complete Meta Tech Provider/Embedded Signup setup for lowest-cost direct path.','Long-term primary when direct onboarding is approved.')
on conflict(provider_key) do update set phase=excluded.phase,priority=excluded.priority,status=excluded.status,owner=excluded.owner,required_items=excluded.required_items,next_action=excluded.next_action,notes=excluded.notes,updated_at=now();