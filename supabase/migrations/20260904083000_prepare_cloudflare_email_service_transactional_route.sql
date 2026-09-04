update public.email_engine_providers
set priority = 35,
    status = 'inactive',
    daily_soft_limit = null,
    monthly_soft_limit = 3000,
    cost_usd_per_1000 = 0.35,
    secret_setting_key = 'cloudflare_email_sending_token',
    capabilities = array['email_api','smtp','transactional','dkim','email_routing'],
    config = coalesce(config,'{}'::jsonb) || jsonb_build_object(
      'role','clean_transactional_future',
      'rest_api_endpoint','/accounts/{account_id}/email/sending/send',
      'smtp_host','smtp.mx.cloudflare.net',
      'smtp_port',465,
      'tls','implicit',
      'username','api_token',
      'workers_paid_required_for_arbitrary_recipients',true,
      'workers_paid_included_monthly',3000,
      'overage_usd_per_1000',0.35,
      'marketing_bulk_allowed',false,
      'provider_branding_allowed',false,
      'visible_provider_branding',false,
      'zero_spend_lock',true,
      'subscriber_paid_unlock_threshold',100,
      'email_sending_permission_required','Email Sending: Edit',
      'domain_required','cloudsales.app',
      'status_reason','waiting_for_email_sending_onboarding_and_dedicated_token'
    ),
    updated_at = now()
where provider_key='cloudflare_email_service';

insert into public.email_engine_brand_providers(
  brand_key,provider_key,secret_setting_key,priority,status,
  transactional_enabled,lifecycle_enabled,marketing_enabled,config
)
values(
  'cloudsales','cloudflare_email_service','cloudflare_email_sending_token',35,'inactive',
  true,false,false,
  jsonb_build_object(
    'routing_class','clean_transactional_future',
    'audience','existing_users',
    'provider_branding_allowed',false,
    'activation_requires','domain_onboarded_and_token_valid_and_paid_mode_unlocked'
  )
)
on conflict (brand_key,provider_key) do update
set secret_setting_key=excluded.secret_setting_key,
    priority=excluded.priority,
    status='inactive',
    transactional_enabled=true,
    lifecycle_enabled=false,
    marketing_enabled=false,
    config=coalesce(public.email_engine_brand_providers.config,'{}'::jsonb)||excluded.config,
    updated_at=now();