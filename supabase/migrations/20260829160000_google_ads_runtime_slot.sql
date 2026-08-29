-- Supabase plan limit: map the canonical Google Ads adapter source to a proven-obsolete Edge Function slug.
-- cloudflare-pwa-release-v6 executed once on 2026-08-27 and was superseded by v7-v12.
update public.provider_catalog
set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
  'runtime_slug','cloudflare-pwa-release-v6',
  'runtime_source','supabase/functions/google-ads-command/index.ts',
  'runtime_slot_reclaimed_from','cloudsales-pwa-v6',
  'runtime_slot_reclaimed_at','2026-08-29T15:55:00Z'
), updated_at=now()
where provider_key='google_ads';
