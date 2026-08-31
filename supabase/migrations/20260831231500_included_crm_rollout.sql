-- CloudSales CRM onboarding rollout.
-- Customer-facing language is provider-neutral: "CRM incluido con CloudSales".
-- The backing provider remains an internal implementation detail.

insert into public.internal_settings(setting_key,value,updated_at)
values (
  'cloudsales_included_crm_rollout',
  jsonb_build_object(
    'enabled', true,
    'temporary', true,
    'public_label', 'CRM incluido con CloudSales',
    'template_key', 'cs_general_sales_v1',
    'provider_internal', 'highlevel',
    'rollout_revision', '2026-08-31'
  ),
  now()
)
on conflict (setting_key) do update set
  value = excluded.value,
  updated_at = now();

update public.subscription_plans
set features = coalesce(features,'{}'::jsonb) || jsonb_build_object(
  'crm_infrastructure_included_rollout', true,
  'crm_infrastructure_public_label', 'CRM incluido',
  'crm_infrastructure_revision', '2026-08-31'
), updated_at = now()
where active = true and plan_key in ('basic','pro','premium');

comment on table public.provider_app_credentials is
'Platform OAuth credentials. Secrets are stored by Vault reference and must never be exposed to tenant clients.';
