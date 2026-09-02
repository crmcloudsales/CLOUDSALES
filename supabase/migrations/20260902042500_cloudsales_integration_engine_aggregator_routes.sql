begin;

insert into public.cloudco_engine_registry(engine_key,canonical_name,version,status,layer,description,product_consumers,verticals,metadata)
values ('integration','CLOUDCO INTEGRATION ENGINE','v1','building','the_core','Provider abstraction, secure credentials, OAuth/API adapters, capability routing, mappings, connection health and direct-vs-aggregator fallback for CloudSales.',array['cloudsales'],array['service_business'],jsonb_build_object('canonical',true,'product_runtime','cloudsales','routing_strategy','direct_first_aggregator_fallback','priority','R0'))
on conflict (engine_key) do update set canonical_name=excluded.canonical_name,version=excluded.version,status=excluded.status,description=excluded.description,product_consumers=excluded.product_consumers,verticals=excluded.verticals,metadata=coalesce(public.cloudco_engine_registry.metadata,'{}'::jsonb)||excluded.metadata,updated_at=now();

insert into public.provider_catalog(provider_key,display_name,category,auth_type,availability,sort_order,metadata)
values
('zernio','Zernio','other','api_key','beta',106,jsonb_build_object('provider_type','unified_social_api','routing_role','aggregator','api_base_url','https://zernio.com/api/v1','credential_mode','platform_api_key','tenant_model','one_profile_per_cloudsales_organization','end_user_connections','provider_hosted_oauth','capabilities',jsonb_build_array('social.read','social.publish','conversation.read','conversation.send','analytics.snapshot','campaign.read','campaign.create','campaign.pause'),'preferred_aggregator',true)),
('ayrshare','Ayrshare','other','api_key','planned',107,jsonb_build_object('provider_type','unified_social_api','routing_role','aggregator','api_base_url','https://app.ayrshare.com/api','credential_mode','platform_api_key','capabilities',jsonb_build_array('social.read','social.publish','conversation.read','conversation.send','analytics.snapshot'),'preferred_aggregator',false)),
('postproxy','Postproxy','other','api_key','planned',108,jsonb_build_object('provider_type','unified_social_api','routing_role','aggregator','credential_mode','platform_api_key','capabilities',jsonb_build_array('social.read','social.publish'),'preferred_aggregator',false))
on conflict (provider_key) do update set display_name=excluded.display_name,category=excluded.category,auth_type=excluded.auth_type,availability=excluded.availability,sort_order=excluded.sort_order,metadata=coalesce(public.provider_catalog.metadata,'{}'::jsonb)||excluded.metadata,updated_at=now();

insert into public.integration_readiness(provider_key,phase,priority,status,owner,required_items,next_action,notes)
values
('zernio',2,'critical','in_progress','shared',jsonb_build_array('Zernio platform API key stored in Vault','CloudSales organization to Zernio profile mapping','secure social-account connect callback'),'Deploy the CloudSales Zernio adapter and keep direct provider APIs as preferred routes when they offer deeper capabilities.','Zernio is an aggregator/fallback inside CloudSales Integration Engine, not the canonical data model or the only provider.'),
('ayrshare',3,'medium','planned','shared',jsonb_build_array('Ayrshare platform account','API key stored in Vault','profile mapping'),'Keep as a tested secondary unified-social fallback after Zernio.','Secondary aggregator candidate; do not activate until adapter tests and cost controls pass.'),
('postproxy',3,'low','planned','shared',jsonb_build_array('Postproxy platform account','API key stored in Vault'),'Keep as publishing-focused fallback.','Publishing-focused secondary provider; not a replacement for messaging/ads-capable routes.')
on conflict (provider_key) do update set phase=excluded.phase,priority=excluded.priority,status=excluded.status,owner=excluded.owner,required_items=excluded.required_items,next_action=excluded.next_action,notes=excluded.notes,updated_at=now();

insert into public.provider_capabilities(provider_key,capability_key,support_status,write_capable,requires_provider_review,notes,metadata)
values
('zernio','social.read','beta',false,false,'Normalized social account/post read path through aggregator.','{}'::jsonb),
('zernio','social.publish','beta',true,false,'Publishing requires normal CloudSales approval gates before dispatch.','{}'::jsonb),
('zernio','conversation.read','beta',false,false,'Unified engagement/inbox read where the downstream platform exposes it.','{}'::jsonb),
('zernio','conversation.send','beta',true,false,'Outbound messages retain CloudSales consent and approval rules.','{}'::jsonb),
('zernio','analytics.snapshot','beta',false,false,'Normalized social/engagement analytics snapshot.','{}'::jsonb),
('zernio','campaign.read','planned',false,false,'Paid-media read through aggregator where supported.','{}'::jsonb),
('zernio','campaign.create','planned',true,false,'Paid-media creation remains approval-gated.','{}'::jsonb),
('zernio','campaign.pause','planned',true,false,'Paid-media pause remains approval-gated.','{}'::jsonb),
('ayrshare','social.read','planned',false,false,'Secondary aggregator read route.','{}'::jsonb),
('ayrshare','social.publish','planned',true,false,'Secondary aggregator publishing route.','{}'::jsonb),
('ayrshare','conversation.read','planned',false,false,'Secondary engagement route.','{}'::jsonb),
('ayrshare','conversation.send','planned',true,false,'Secondary outbound engagement route.','{}'::jsonb),
('ayrshare','analytics.snapshot','planned',false,false,'Secondary analytics route.','{}'::jsonb),
('postproxy','social.read','planned',false,false,'Publishing-oriented secondary route.','{}'::jsonb),
('postproxy','social.publish','planned',true,false,'Publishing-oriented secondary route.','{}'::jsonb)
on conflict (provider_key,capability_key) do update set support_status=excluded.support_status,write_capable=excluded.write_capable,requires_provider_review=excluded.requires_provider_review,notes=excluded.notes,metadata=excluded.metadata,updated_at=now();

create table if not exists public.integration_provider_routes (
 capability_key text not null,
 provider_key text not null references public.provider_catalog(provider_key) on delete cascade,
 route_type text not null check (route_type in ('direct','aggregator','fallback')),
 priority integer not null default 100 check (priority between 1 and 1000),
 enabled boolean not null default true,
 minimum_support_status text not null default 'beta' check (minimum_support_status in ('implemented','beta','planned')),
 quality_weight numeric(6,3) not null default 1.000,
 cost_weight numeric(6,3) not null default 1.000,
 latency_weight numeric(6,3) not null default 1.000,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(capability_key,provider_key)
);
alter table public.integration_provider_routes enable row level security;
create index if not exists idx_integration_provider_routes_resolve on public.integration_provider_routes(capability_key,enabled,priority);

insert into public.integration_provider_routes(capability_key,provider_key,route_type,priority,minimum_support_status,quality_weight,cost_weight,latency_weight,metadata)
values
('social.read','zernio','aggregator',50,'beta',1,1,1,jsonb_build_object('strategy','fallback_when_no_direct_connection')),
('social.publish','zernio','aggregator',50,'beta',1,1,1,jsonb_build_object('strategy','fallback_when_no_direct_connection')),
('conversation.read','zernio','aggregator',55,'beta',1,1,1,jsonb_build_object('strategy','fallback_when_no_direct_connection')),
('conversation.send','zernio','aggregator',55,'beta',1,1,1,jsonb_build_object('strategy','fallback_when_no_direct_connection')),
('analytics.snapshot','zernio','aggregator',60,'beta',1,1,1,jsonb_build_object('strategy','fallback_when_no_direct_connection')),
('social.read','ayrshare','fallback',80,'planned',1,1,1,'{}'::jsonb),
('social.publish','ayrshare','fallback',80,'planned',1,1,1,'{}'::jsonb),
('social.read','postproxy','fallback',90,'planned',1,1,1,'{}'::jsonb),
('social.publish','postproxy','fallback',90,'planned',1,1,1,'{}'::jsonb)
on conflict (capability_key,provider_key) do update set route_type=excluded.route_type,priority=excluded.priority,enabled=excluded.enabled,minimum_support_status=excluded.minimum_support_status,quality_weight=excluded.quality_weight,cost_weight=excluded.cost_weight,latency_weight=excluded.latency_weight,metadata=excluded.metadata,updated_at=now();

commit;
