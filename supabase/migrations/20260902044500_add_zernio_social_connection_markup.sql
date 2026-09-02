insert into public.usage_markup_rules(brand_key,plan_key,usage_category,markup_percent,active,metadata)
values
('cloudsales','basic','social_connection',50,true,jsonb_build_object('basis','landed_provider_cost','source','canonical_pricing_2026_09_01','provider','zernio','provider_pricing_snapshot','2026-09-02','provider_meter','connected_account_month','free_accounts',2,'tier_3_10_usd',6,'tier_11_100_usd',3,'tier_101_plus_usd',1,'pricing_page','https://cloudsales.app/usage-pricing')),
('cloudsales','pro','social_connection',35,true,jsonb_build_object('basis','landed_provider_cost','source','canonical_pricing_2026_09_01','provider','zernio','provider_pricing_snapshot','2026-09-02','provider_meter','connected_account_month','free_accounts',2,'tier_3_10_usd',6,'tier_11_100_usd',3,'tier_101_plus_usd',1,'pricing_page','https://cloudsales.app/usage-pricing')),
('cloudsales','premium','social_connection',25,true,jsonb_build_object('basis','landed_provider_cost','source','canonical_pricing_2026_09_01','provider','zernio','provider_pricing_snapshot','2026-09-02','provider_meter','connected_account_month','free_accounts',2,'tier_3_10_usd',6,'tier_11_100_usd',3,'tier_101_plus_usd',1,'pricing_page','https://cloudsales.app/usage-pricing'))
on conflict (brand_key,plan_key,usage_category) do update set markup_percent=excluded.markup_percent,active=excluded.active,metadata=excluded.metadata,updated_at=now();

update public.integration_readiness
set next_action='Store the Zernio platform API key in Vault, then run one real tenant profile + OAuth account connection. Adapter, tenant isolation, callback verification and route guard are already deployed.',updated_at=now()
where provider_key='zernio';
