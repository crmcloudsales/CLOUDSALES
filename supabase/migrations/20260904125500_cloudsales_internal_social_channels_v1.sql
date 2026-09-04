-- CloudSales brand-first social/community topology.
-- This migration records provider/channel intent without falsely marking external OAuth as connected.

begin;

update public.connections
set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
  'expected_channels', jsonb_build_array('linkedin','tiktok','threads'),
  'setup_state','provider_channels_confirmed_backend_auth_pending',
  'brand_key','cloudsales',
  'account_scope','organization',
  'tenant_isolated',true
), updated_at=now()
where organization_id='b664b5bb-986b-4fdb-b9f7-4d4d329d6599'::uuid and provider_key='buffer';

insert into public.provider_catalog(provider_key,display_name,category,auth_type,availability,sort_order,metadata)
values
('youtube','YouTube','other','oauth2','beta',310,jsonb_build_object('provider_type','native_social_api','api_family','YouTube Data API v3','tenant_model','one_channel_connection_per_organization','internal_first',true,'brand_key','cloudsales','native_preferred',true)),
('google_business_profile','Google Business Profile','other','oauth2','beta',320,jsonb_build_object('provider_type','native_local_presence_api','api_family','Google Business Profile APIs','tenant_model','one_business_profile_connection_per_organization','internal_first',true,'brand_key','cloudsales','native_preferred',true,'capability_domains',jsonb_build_array('posts','reviews','performance')))
on conflict (provider_key) do update set display_name=excluded.display_name,category=excluded.category,auth_type=excluded.auth_type,availability=excluded.availability,metadata=public.provider_catalog.metadata||excluded.metadata,updated_at=now();

insert into public.provider_capabilities(provider_key,capability_key,support_status,write_capable,requires_provider_review,notes,metadata)
values
('youtube','social.publish','planned',true,false,'YouTube Data API v3 native upload path; OAuth/channel E2E not yet validated.','{"native":true,"internal_first":true}'::jsonb),
('youtube','social.read','planned',false,false,'Native YouTube channel/video retrieval planned behind provider adapter.','{"native":true}'::jsonb),
('youtube','analytics.snapshot','planned',false,false,'YouTube analytics snapshot pending native account authorization.','{"native":true}'::jsonb),
('google_business_profile','social.publish','planned',true,false,'Google Business Profile local posts native path; account/location E2E pending.','{"native":true,"internal_first":true}'::jsonb),
('google_business_profile','review.read','planned',false,false,'Google Business Profile review synchronization planned.','{"native":true}'::jsonb),
('google_business_profile','review.reply','planned',true,false,'Google Business Profile review replies planned with explicit organization authorization.','{"native":true}'::jsonb),
('google_business_profile','analytics.snapshot','planned',false,false,'Google Business Profile performance snapshot planned.','{"native":true}'::jsonb)
on conflict (provider_key,capability_key) do update set support_status=excluded.support_status,write_capable=excluded.write_capable,requires_provider_review=excluded.requires_provider_review,notes=excluded.notes,metadata=public.provider_capabilities.metadata||excluded.metadata,updated_at=now();

insert into public.integration_provider_routes(capability_key,provider_key,route_type,priority,enabled,minimum_support_status,quality_weight,cost_weight,latency_weight,metadata)
values
('social.publish','youtube','direct',5,true,'planned',1,1,1,'{"channel":"youtube","strategy":"native_preferred","internal_first":true}'::jsonb),
('social.publish','google_business_profile','direct',5,true,'planned',1,1,1,'{"channel":"google_business","strategy":"native_preferred","internal_first":true}'::jsonb),
('review.read','google_business_profile','direct',5,true,'planned',1,1,1,'{"strategy":"native_only","internal_first":true}'::jsonb),
('review.reply','google_business_profile','direct',5,true,'planned',1,1,1,'{"strategy":"native_only","internal_first":true}'::jsonb),
('analytics.snapshot','youtube','direct',5,true,'planned',1,1,1,'{"strategy":"native_preferred","internal_first":true}'::jsonb),
('analytics.snapshot','google_business_profile','direct',5,true,'planned',1,1,1,'{"strategy":"native_preferred","internal_first":true}'::jsonb)
on conflict (capability_key,provider_key) do update set route_type=excluded.route_type,priority=excluded.priority,enabled=excluded.enabled,minimum_support_status=excluded.minimum_support_status,metadata=public.integration_provider_routes.metadata||excluded.metadata,updated_at=now();

insert into public.integration_readiness(provider_key,phase,priority,status,owner,required_items,next_action,notes)
values
('buffer',1,'critical','blocked_user_action','shared','["provider_account_api_authorization","channel_id_sync"]'::jsonb,'Authorize the CloudSales Buffer API account, then sync LinkedIn, TikTok and Threads channel IDs.','Provider-side channels are confirmed connected; backend authorization is the remaining gate.'),
('youtube',1,'critical','blocked_user_action','shared','["google_oauth_client","youtube_channel_consent","e2e_upload_validation"]'::jsonb,'Complete OAuth/account consent for the CloudSales YouTube channel, then run an E2E private/unlisted upload test.','YouTube Data API is enabled; do not mark connected until token/channel is verified.'),
('google_business_profile',1,'high','blocked_user_action','shared','["google_oauth_client","business_profile_consent","location_selection","e2e_post_validation"]'::jsonb,'Complete Google Business Profile authorization and location selection, then validate a native post and review sync.','Native API is preferred; reviews, replies, posts and performance remain unvalidated.')
on conflict (provider_key) do update set phase=excluded.phase,priority=excluded.priority,status=excluded.status,owner=excluded.owner,required_items=excluded.required_items,next_action=excluded.next_action,notes=excluded.notes,updated_at=now();

insert into public.organization_channel_identities(organization_id,channel,identity_type,address,display_name,is_primary,status,provider_key,inbound_enabled,outbound_enabled,routing_mode,metadata)
values
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','social','platform','instagram','CloudSales Instagram',true,'pending','zernio',true,true,'provider','{"brand_key":"cloudsales","network":"instagram","internal_first":true}'::jsonb),
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','social','platform','facebook','CloudSales Facebook',false,'pending','zernio',true,true,'provider','{"brand_key":"cloudsales","network":"facebook","internal_first":true}'::jsonb),
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','social','platform','linkedin','CloudSales LinkedIn',false,'pending','buffer',false,true,'provider','{"brand_key":"cloudsales","network":"linkedin","provider_side_connected":true,"backend_auth_pending":true,"internal_first":true}'::jsonb),
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','social','platform','tiktok','CloudSales TikTok',false,'pending','buffer',false,true,'provider','{"brand_key":"cloudsales","network":"tiktok","provider_side_connected":true,"backend_auth_pending":true,"internal_first":true}'::jsonb),
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','social','platform','threads','CloudSales Threads',false,'pending','buffer',false,true,'provider','{"brand_key":"cloudsales","network":"threads","provider_side_connected":true,"backend_auth_pending":true,"internal_first":true}'::jsonb),
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','social','platform','youtube','CloudSales YouTube',false,'pending','youtube',false,true,'provider','{"brand_key":"cloudsales","network":"youtube","api_enabled":true,"oauth_pending":true,"internal_first":true}'::jsonb),
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','social','platform','google_business','CloudSales Google Business Profile',false,'pending','google_business_profile',true,true,'provider','{"brand_key":"cloudsales","network":"google_business","oauth_pending":true,"reviews_enabled_target":true,"internal_first":true}'::jsonb)
on conflict (organization_id,channel,address) do update set display_name=excluded.display_name,status=excluded.status,provider_key=excluded.provider_key,inbound_enabled=excluded.inbound_enabled,outbound_enabled=excluded.outbound_enabled,routing_mode=excluded.routing_mode,metadata=public.organization_channel_identities.metadata||excluded.metadata,updated_at=now();

commit;
