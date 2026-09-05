-- CloudSales Telnyx runtime consolidation.
-- Supabase project is at the Edge Function count limit, so Telnyx setup + signed webhook handling
-- run through the existing connection-secret-setup function. Provider routing remains disabled until live E2E.
begin;

update public.communications_engine_webhooks
set endpoint='https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/connection-secret-setup',
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
      'runtime_consolidated',true,
      'handler','connection-secret-setup'
    ),
    updated_at=now()
where provider_key='telnyx'
  and channel in ('sms','whatsapp');

update public.integration_readiness
set notes=concat_ws(' ',notes,'Runtime consolidated into connection-secret-setup because the Supabase project reached its Edge Function count limit. No production routing is enabled by this change.'),
    updated_at=now()
where provider_key='telnyx';

commit;
