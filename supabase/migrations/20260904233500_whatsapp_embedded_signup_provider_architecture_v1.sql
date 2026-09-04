-- CloudSales WhatsApp onboarding architecture.
-- Providers remain capability-gated and disabled until each partner/Meta prerequisite is actually ready.
begin;

insert into public.provider_catalog(provider_key,display_name,category,auth_type,availability,sort_order,metadata)
values
 ('meta_whatsapp','WhatsApp Business Platform (Meta)','messaging','oauth2','planned',210,jsonb_build_object('channel','whatsapp','provider_type','native','onboarding_mode','meta_embedded_signup','tenant_model','one_or_more_waba_phone_numbers_per_organization','preferred_role','primary_long_term','phone_verification','otp_sms_or_voice','cloudsales_managed_connection',true)),
 ('vonage_whatsapp','Vonage WhatsApp','messaging','oauth2','planned',220,jsonb_build_object('channel','whatsapp','provider_type','bsp','onboarding_mode','provider_hosted_embedded_signup','white_label_onboarding',true,'phone_verification','otp','preferred_role','hosted_onboarding_fallback')),
 ('gupshup_whatsapp','Gupshup WhatsApp','messaging','oauth2','planned',225,jsonb_build_object('channel','whatsapp','provider_type','bsp','onboarding_mode','embedded_signup','phone_verification','otp','preferred_role','hosted_onboarding_candidate')),
 ('infobip_whatsapp','Infobip WhatsApp','messaging','oauth2','planned',230,jsonb_build_object('channel','whatsapp','provider_type','bsp','onboarding_mode','meta_embedded_signup','phone_verification','otp_sms_or_voice','preferred_role','global_bsp_candidate')),
 ('twilio_whatsapp','Twilio WhatsApp','messaging','oauth2','planned',235,jsonb_build_object('channel','whatsapp','provider_type','bsp','onboarding_mode','meta_self_signup','phone_verification','otp_sms_or_voice','preferred_role','global_bsp_fallback'))
on conflict (provider_key) do update set display_name=excluded.display_name,category=excluded.category,auth_type=excluded.auth_type,availability=excluded.availability,sort_order=excluded.sort_order,metadata=public.provider_catalog.metadata||excluded.metadata,updated_at=now();

insert into public.provider_capabilities(provider_key,capability_key,support_status,write_capable,requires_provider_review,notes,metadata)
select p.provider_key,c.capability_key,'planned',c.write_capable,true,c.notes,jsonb_build_object('channel','whatsapp','requires_tenant_connection',true)
from (values
 ('whatsapp.connect.start',true,'Start tenant WhatsApp onboarding/embedded signup.'),
 ('whatsapp.connect.complete',true,'Complete and verify tenant WhatsApp sender onboarding.'),
 ('whatsapp.send',true,'Send WhatsApp message subject to Meta conversation/template rules.'),
 ('whatsapp.receive',false,'Receive WhatsApp messages through verified webhooks.'),
 ('whatsapp.template.send',true,'Send approved WhatsApp template messages.'),
 ('whatsapp.media.send',true,'Send supported WhatsApp media.'),
 ('message.status',false,'Read delivery and message status events.'),
 ('message.thread.read',false,'Read normalized conversation thread.'),
 ('message.thread.reply',true,'Reply through the normalized CloudSales conversation thread.')
) as c(capability_key,write_capable,notes)
cross join (values ('meta_whatsapp'),('vonage_whatsapp'),('gupshup_whatsapp'),('infobip_whatsapp'),('twilio_whatsapp')) as p(provider_key)
on conflict (provider_key,capability_key) do update set support_status=excluded.support_status,write_capable=excluded.write_capable,requires_provider_review=excluded.requires_provider_review,notes=excluded.notes,metadata=public.provider_capabilities.metadata||excluded.metadata,updated_at=now();

insert into public.integration_provider_routes(capability_key,provider_key,route_type,priority,enabled,minimum_support_status,quality_weight,cost_weight,latency_weight,metadata)
values
 ('whatsapp.connect.start','meta_whatsapp','direct',10,false,'beta',1,1,1,jsonb_build_object('activation_gate','meta_tech_provider_ready','onboarding_mode','meta_embedded_signup')),
 ('whatsapp.connect.start','vonage_whatsapp','aggregator',20,false,'beta',1,1,1,jsonb_build_object('activation_gate','vonage_solution_ready','onboarding_mode','provider_hosted_embedded_signup')),
 ('whatsapp.connect.start','gupshup_whatsapp','aggregator',25,false,'beta',1,1,1,jsonb_build_object('activation_gate','gupshup_partner_ready','onboarding_mode','embedded_signup')),
 ('whatsapp.connect.start','infobip_whatsapp','aggregator',30,false,'beta',1,1,1,jsonb_build_object('activation_gate','infobip_partner_ready','onboarding_mode','meta_embedded_signup')),
 ('whatsapp.connect.start','twilio_whatsapp','aggregator',35,false,'beta',1,1,1,jsonb_build_object('activation_gate','twilio_tech_provider_ready','onboarding_mode','meta_self_signup'))
on conflict (capability_key,provider_key) do update set route_type=excluded.route_type,priority=excluded.priority,enabled=excluded.enabled,minimum_support_status=excluded.minimum_support_status,metadata=public.integration_provider_routes.metadata||excluded.metadata,updated_at=now();

commit;
