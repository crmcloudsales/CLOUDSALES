-- CloudSales billing isolation guard.
-- Historical shared-account identifiers are preserved for audit/migration, but cannot be used for NEW CloudSales checkout.

insert into public.internal_settings(setting_key,value)
values (
  'billing_checkout',
  jsonb_build_object(
    'provider','stripe',
    'brand','cloudsales',
    'mode','embedded',
    'checkout_enabled',false,
    'account_alias','cloudsales_dedicated_required',
    'dedicated_account_required',true,
    'legacy_shared_account_blocked',true,
    'customer_portal_enabled',false,
    'app_host','https://app.cloudsales.app',
    'checkout_host','https://cloudsales.app',
    'success_path','/app?billing=success',
    'cancel_path','/pricing?billing=cancelled',
    'updated_at',now()
  )
)
on conflict (setting_key) do update set
  value = coalesce(public.internal_settings.value,'{}'::jsonb) || jsonb_build_object(
    'provider','stripe',
    'brand','cloudsales',
    'checkout_enabled',false,
    'account_alias','cloudsales_dedicated_required',
    'dedicated_account_required',true,
    'legacy_shared_account_blocked',true,
    'customer_portal_enabled',false,
    'updated_at',now()
  );

-- Preserve legacy Stripe IDs, but mark them explicitly as shared/temp and unusable for new checkout.
update public.billable_items
set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
  'stripe_account_alias','listia_shared_temp_legacy',
  'cloudsales_new_checkout_allowed',false,
  'migration_required','cloudsales_dedicated_stripe',
  'legacy_marked_at',now()
)
where brand_key='cloudsales'
  and stripe_price_id is not null
  and coalesce(metadata->>'stripe_account_alias','') <> 'cloudsales_dedicated';

-- Keep shared/temp secrets for historical webhook reconciliation only. New checkout code is forbidden from reading them.
update public.internal_settings
set value = coalesce(value,'{}'::jsonb) || jsonb_build_object(
  'legacy_only',true,
  'new_checkout_forbidden',true,
  'migration_target','cloudsales_dedicated_stripe',
  'marked_at',now()
)
where setting_key in (
  'stripe_webhook_secret_cloudsales_shared_temp',
  'stripe_secret_key_cloudsales_shared_temp',
  'stripe_publishable_key_cloudsales_shared_temp'
);

comment on table public.billable_items is 'Commercial items. Stripe provider identifiers must be account-scoped in metadata before use; legacy shared/temp IDs are not valid for new CloudSales checkout.';
