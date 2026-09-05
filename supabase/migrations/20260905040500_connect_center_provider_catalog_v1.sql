-- CloudSales Connect Center provider catalog.
-- UI visibility does not imply production readiness. Providers remain planned until adapter + OAuth/API + E2E pass.
insert into public.provider_catalog(provider_key,display_name,category,auth_type,availability,sort_order,metadata) values
('clientify','Clientify','crm','oauth2','planned',88,jsonb_build_object('ui_section','crm','connection_center',true)),
('wordpress','WordPress','other','oauth2','planned',150,jsonb_build_object('ui_section','other','connection_center',true)),
('godaddy','GoDaddy','other','oauth2','planned',151,jsonb_build_object('ui_section','other','connection_center',true)),
('hostgator','HostGator','other','oauth2','planned',152,jsonb_build_object('ui_section','other','connection_center',true)),
('hostinger','Hostinger','other','oauth2','planned',153,jsonb_build_object('ui_section','other','connection_center',true)),
('wix','Wix','other','oauth2','planned',154,jsonb_build_object('ui_section','other','connection_center',true)),
('notion','Notion','other','oauth2','planned',155,jsonb_build_object('ui_section','other','connection_center',true)),
('apple','Apple','other','oauth2','planned',199,jsonb_build_object('ui_section','other','connection_center',true,'coming_soon',true)),
('tiktok','TikTok Ecosystem','other','oauth2','planned',149,jsonb_build_object('ui_section','other','connection_center',true))
on conflict(provider_key) do update set display_name=excluded.display_name,metadata=public.provider_catalog.metadata||excluded.metadata,updated_at=now();

insert into public.integration_readiness(provider_key,phase,priority,status,owner,required_items,next_action,notes)
select p.provider_key,6,'medium','planned','cloudsales',jsonb_build_array('official API/OAuth eligibility','scopes review','adapter contract tests','E2E authorization'), 'Implement only after official provider contract and OAuth/API requirements are verified.', 'Listed in Connect Center; not presented as live until adapter and authorization pass E2E.'
from public.provider_catalog p where p.provider_key in ('clientify','wordpress','godaddy','hostgator','hostinger','wix','notion','apple','tiktok')
on conflict(provider_key) do nothing;
