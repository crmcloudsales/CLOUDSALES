-- CloudSales email routing policy
-- Acquisition (marketing/lifecycle): only clean-brand providers.
-- Existing users (transactional): use other providers so acquisition quota stays protected.
-- Paid clean-brand sending is permanently unlocked once CloudSales reaches 100 active paid subscribers.

update public.email_engine_brand_providers
set transactional_enabled = false,
    lifecycle_enabled = true,
    marketing_enabled = true,
    config = coalesce(config,'{}'::jsonb) || jsonb_build_object(
      'routing_class','acquisition_clean',
      'audience','prospects',
      'provider_branding_allowed',false,
      'reserved_for_acquisition',true
    ),
    updated_at = now()
where brand_key='cloudsales' and provider_key in ('amazon_ses','resend','mailgun');

update public.email_engine_brand_providers
set transactional_enabled = true,
    lifecycle_enabled = false,
    marketing_enabled = false,
    config = coalesce(config,'{}'::jsonb) || jsonb_build_object(
      'routing_class','existing_user_operations',
      'audience','existing_users',
      'provider_branding_allowed',true,
      'reserved_for_acquisition',false
    ),
    updated_at = now()
where brand_key='cloudsales' and provider_key in ('sender','brevo','mailjet');

update public.email_engine_providers set priority=10, updated_at=now() where provider_key='amazon_ses';
update public.email_engine_providers set priority=20, updated_at=now() where provider_key='resend';
update public.email_engine_providers set priority=30, updated_at=now() where provider_key='mailgun';
update public.email_engine_providers set priority=40, updated_at=now() where provider_key='sender';
update public.email_engine_providers set priority=50, updated_at=now() where provider_key='brevo';
update public.email_engine_providers set priority=60, updated_at=now() where provider_key='mailjet';

update public.email_engine_providers
set config = coalesce(config,'{}'::jsonb) || jsonb_build_object(
  'acquisition_eligible', true,
  'provider_branding_allowed', false,
  'subscriber_paid_unlock_threshold', 100
), updated_at=now()
where provider_key in ('amazon_ses','resend','mailgun');

update public.email_engine_providers
set config = coalesce(config,'{}'::jsonb) || jsonb_build_object(
  'acquisition_eligible', false,
  'transactional_only_while_branded', true
), updated_at=now()
where provider_key in ('sender','brevo','mailjet');

insert into public.internal_settings(setting_key, secret_id, value)
values (
  'cloudsales_email_growth_routing_policy',
  null,
  jsonb_build_object(
    'version','2026-09-04',
    'marketing_lifecycle','clean_brand_only',
    'transactional','other_providers_first',
    'paid_unlock_active_subscribers',100,
    'threshold_reached',false,
    'paid_mode_unlocked',false,
    'canonical_marketing_from','info@cloudsales.app',
    'canonical_transactional_from','noreply@cloudsales.app'
  )
)
on conflict (setting_key) do update
set value = coalesce(public.internal_settings.value,'{}'::jsonb) || excluded.value,
    updated_at = now();

create or replace function public.sync_cloudsales_email_paid_unlock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active integer := 0;
  v_prev_reached boolean := false;
  v_reached boolean := false;
  v_policy jsonb := '{}'::jsonb;
begin
  select count(*)::integer into v_active
  from public.subscriptions
  where brand_key='cloudsales' and status='active';

  select coalesce(value,'{}'::jsonb) into v_policy
  from public.internal_settings
  where setting_key='cloudsales_email_growth_routing_policy';

  v_prev_reached := coalesce((v_policy->>'threshold_reached')::boolean,false);
  v_reached := v_prev_reached or v_active >= 100;

  update public.internal_settings
  set value = coalesce(value,'{}'::jsonb) || jsonb_build_object(
        'active_paid_subscribers',v_active,
        'paid_unlock_active_subscribers',100,
        'threshold_reached',v_reached,
        'paid_mode_unlocked',v_reached,
        'last_evaluated_at',now()
      ),
      updated_at=now()
  where setting_key='cloudsales_email_growth_routing_policy';

  update public.email_engine_providers
  set config = coalesce(config,'{}'::jsonb) || jsonb_build_object(
        'zero_spend_lock',not v_reached,
        'overage_allowed',v_reached,
        'paid_usage_authorized_by_subscriber_threshold',v_reached,
        'active_paid_subscribers',v_active,
        'subscriber_paid_unlock_threshold',100
      ),
      updated_at=now()
  where provider_key='amazon_ses';

  update public.email_engine_providers
  set config = coalesce(config,'{}'::jsonb) || jsonb_build_object(
        'paid_plan_upgrade_authorized',v_reached,
        'active_paid_subscribers',v_active,
        'subscriber_paid_unlock_threshold',100
      ),
      updated_at=now()
  where provider_key in ('resend','mailgun');

  return null;
end;
$$;

revoke all on function public.sync_cloudsales_email_paid_unlock() from public, anon, authenticated;
grant execute on function public.sync_cloudsales_email_paid_unlock() to service_role;

drop trigger if exists trg_sync_cloudsales_email_paid_unlock on public.subscriptions;
create trigger trg_sync_cloudsales_email_paid_unlock
after insert or update or delete on public.subscriptions
for each statement execute function public.sync_cloudsales_email_paid_unlock();

do $$
declare v_active integer; v_policy jsonb; v_prev boolean; v_reached boolean;
begin
  select count(*)::integer into v_active
  from public.subscriptions
  where brand_key='cloudsales' and status='active';

  select coalesce(value,'{}'::jsonb) into v_policy
  from public.internal_settings
  where setting_key='cloudsales_email_growth_routing_policy';

  v_prev := coalesce((v_policy->>'threshold_reached')::boolean,false);
  v_reached := v_prev or v_active >= 100;

  update public.internal_settings
  set value=coalesce(value,'{}'::jsonb)||jsonb_build_object(
        'active_paid_subscribers',v_active,
        'threshold_reached',v_reached,
        'paid_mode_unlocked',v_reached,
        'last_evaluated_at',now()
      ),
      updated_at=now()
  where setting_key='cloudsales_email_growth_routing_policy';

  update public.email_engine_providers
  set config=coalesce(config,'{}'::jsonb)||jsonb_build_object(
        'zero_spend_lock',not v_reached,
        'overage_allowed',v_reached,
        'paid_usage_authorized_by_subscriber_threshold',v_reached,
        'active_paid_subscribers',v_active
      ),
      updated_at=now()
  where provider_key='amazon_ses';

  update public.email_engine_providers
  set config=coalesce(config,'{}'::jsonb)||jsonb_build_object(
        'paid_plan_upgrade_authorized',v_reached,
        'active_paid_subscribers',v_active
      ),
      updated_at=now()
  where provider_key in ('resend','mailgun');
end $$;
