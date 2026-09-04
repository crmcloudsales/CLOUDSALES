-- CloudSales brand internal channel/provider bindings. External IDs remain pending until verified.
begin;
insert into public.channel_provider_bindings(organization_id,channel,provider_key,status,inbound_enabled,outbound_enabled,is_primary,capabilities,metadata)
values
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','instagram','zernio','pending',true,true,true,array['social.publish','social.read','conversation.read','conversation.send'],jsonb_build_object('brand_key','cloudsales','provider_side_connected',true,'backend_credential_pending',true)),
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','facebook','zernio','pending',true,true,true,array['social.publish','social.read','conversation.read','conversation.send'],jsonb_build_object('brand_key','cloudsales','provider_side_connected',true,'backend_credential_pending',true)),
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','linkedin','buffer','pending',false,true,true,array['social.publish','social.schedule','social.read'],jsonb_build_object('brand_key','cloudsales','provider_side_connected',true,'backend_credential_pending',true)),
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','tiktok','buffer','pending',false,true,true,array['social.publish','social.schedule','social.read'],jsonb_build_object('brand_key','cloudsales','provider_side_connected',true,'backend_credential_pending',true)),
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','threads','buffer','pending',false,true,true,array['social.publish','social.schedule','social.read'],jsonb_build_object('brand_key','cloudsales','provider_side_connected',true,'backend_credential_pending',true)),
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','youtube','youtube','pending',false,true,true,array['social.publish','social.read','analytics.snapshot'],jsonb_build_object('brand_key','cloudsales','api_enabled',true,'oauth_pending',true)),
('b664b5bb-986b-4fdb-b9f7-4d4d329d6599','google_business','google_business_profile','pending',true,true,true,array['social.publish','review.read','review.reply','analytics.snapshot'],jsonb_build_object('brand_key','cloudsales','oauth_pending',true,'reviews_target',true))
on conflict do nothing;
commit;
