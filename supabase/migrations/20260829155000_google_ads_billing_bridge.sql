-- CloudSales Google Ads API + provider-managed billing bridge

update public.provider_catalog
set
  availability = 'beta',
  metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
    'api_version','v25',
    'oauth_authorize_url','https://accounts.google.com/o/oauth2/v2/auth',
    'oauth_token_url','https://oauth2.googleapis.com/token',
    'oauth_scopes',jsonb_build_array('https://www.googleapis.com/auth/adwords'),
    'billing_mode','provider_managed',
    'billing_portal_url','https://ads.google.com/',
    'payment_data_policy','never_collect_card_data_in_cloudsales',
    'integration_status','code_ready_credentials_required'
  ),
  updated_at = now()
where provider_key = 'google_ads';

insert into public.provider_capabilities(provider_key,capability_key,support_status,write_capable,requires_provider_review,notes,metadata)
values
  ('google_ads','ads.google.accounts','beta',false,true,'List Google Ads customers accessible to the authorized user.',jsonb_build_object('api_version','v25')),
  ('google_ads','ads.google.account.select','beta',true,true,'Persist the tenant-selected Google Ads customer.',jsonb_build_object('api_version','v25')),
  ('google_ads','ads.google.sync','beta',false,true,'Synchronize campaign status, budget and 30-day spend from Google Ads.',jsonb_build_object('api_version','v25')),
  ('google_ads','ads.google.pause','beta',true,true,'Pause a Google Ads campaign and confirm provider state.',jsonb_build_object('api_version','v25')),
  ('google_ads','ads.google.resume','beta',true,true,'Enable a Google Ads campaign and confirm provider state.',jsonb_build_object('api_version','v25')),
  ('google_ads','ads.google.budget','beta',true,true,'Change average daily campaign budget and confirm provider state.',jsonb_build_object('api_version','v25')),
  ('google_ads','ads.google.create_campaign','beta',true,true,'Create a Search campaign container in PAUSED state with an explicit budget.',jsonb_build_object('api_version','v25','create_paused_only',true)),
  ('google_ads','ads.google.billing.manage','beta',false,false,'Open provider-managed Google Ads billing. CloudSales never stores card data.',jsonb_build_object('provider_managed',true))
on conflict (provider_key,capability_key) do update set
  support_status=excluded.support_status,
  write_capable=excluded.write_capable,
  requires_provider_review=excluded.requires_provider_review,
  notes=excluded.notes,
  metadata=excluded.metadata,
  updated_at=now();

insert into public.cloudy_action_catalog(action_key,risk_level,requires_approval,enabled,description)
values
  ('ads.google.accounts','low',false,true,'Read authorized Google Ads accounts.'),
  ('ads.google.account.select','medium',true,true,'Select the Google Ads customer CloudSales should manage.'),
  ('ads.google.sync','low',false,true,'Synchronize Google Ads campaigns and performance.'),
  ('ads.google.pause','medium',true,true,'Pause a Google Ads campaign.'),
  ('ads.google.resume','high',true,true,'Enable a Google Ads campaign that can spend money.'),
  ('ads.google.budget','high',true,true,'Change Google Ads campaign budget.'),
  ('ads.google.create_campaign','medium',true,true,'Create a Google Ads campaign container in paused state.'),
  ('ads.google.billing.manage','low',false,true,'Open provider-managed Google Ads billing.')
on conflict (action_key) do update set
  risk_level=excluded.risk_level,
  requires_approval=excluded.requires_approval,
  enabled=excluded.enabled,
  description=excluded.description;

comment on column public.provider_catalog.metadata is 'Provider metadata may include public OAuth/API/billing URLs. Secrets must remain in Vault and are never stored here.';
