-- Keep Meta signals/CAPI on provider_key=meta and isolate Marketing API authorization on meta_ads.

insert into public.provider_catalog(provider_key,display_name,category,auth_type,availability,sort_order,metadata)
values(
  'meta_ads','Meta Ads','ads','oauth2','beta',115,
  jsonb_build_object(
    'graph_api_version','v24.0',
    'oauth_scopes',jsonb_build_array('ads_read','ads_management'),
    'oauth_authorize_url','https://www.facebook.com/v24.0/dialog/oauth',
    'oauth_token_url','https://graph.facebook.com/v24.0/oauth/access_token',
    'billing_mode','provider_managed',
    'billing_portal_url','https://business.facebook.com/billing_hub',
    'payment_data_policy','never_collect_card_data_in_cloudsales',
    'integration_status','code_ready_credentials_required',
    'oauth_start_runtime_slug','cloudflare-pwa-release-v7',
    'oauth_complete_runtime_slug','cloudflare-pwa-release-v9',
    'command_runtime_slug','cloudflare-pwa-release-v10',
    'oauth_start_source','supabase/functions/meta-ads-oauth-start/index.ts',
    'oauth_complete_source','supabase/functions/meta-ads-oauth-complete/index.ts',
    'command_runtime_source','supabase/functions/meta-ads-command/index.ts',
    'runtime_slots_reclaimed_from',jsonb_build_array('cloudsales-pwa-v7','cloudsales-pwa-v9','cloudsales-pwa-v10')
  )
)
on conflict (provider_key) do update set
  display_name=excluded.display_name,
  category=excluded.category,
  auth_type=excluded.auth_type,
  availability=excluded.availability,
  sort_order=excluded.sort_order,
  metadata=excluded.metadata,
  updated_at=now();

-- CAPI/dataset stays under meta. Ads tools move to meta_ads so Cloudy has one unambiguous connection per provider_key.
delete from public.provider_capabilities where provider_key='meta' and capability_key like 'ads.meta.%';

insert into public.provider_capabilities(provider_key,capability_key,support_status,write_capable,requires_provider_review,notes,metadata)
values
  ('meta_ads','ads.meta.accounts','beta',false,false,'Read authorized Meta ad accounts.',jsonb_build_object('runtime','cloudflare-pwa-release-v10')),
  ('meta_ads','ads.meta.account.select','beta',true,false,'Select the Meta ad account for this tenant.',jsonb_build_object('runtime','cloudflare-pwa-release-v10')),
  ('meta_ads','ads.meta.sync','beta',false,false,'Synchronize campaigns, spend and provider state from Meta.',jsonb_build_object('runtime','cloudflare-pwa-release-v10')),
  ('meta_ads','ads.meta.pause','beta',true,false,'Pause a Meta campaign and verify provider state.',jsonb_build_object('runtime','cloudflare-pwa-release-v10')),
  ('meta_ads','ads.meta.resume','beta',true,false,'Resume a Meta campaign and verify provider state.',jsonb_build_object('runtime','cloudflare-pwa-release-v10')),
  ('meta_ads','ads.meta.budget','beta',true,false,'Change Meta campaign budget and verify provider state.',jsonb_build_object('runtime','cloudflare-pwa-release-v10')),
  ('meta_ads','ads.meta.create_campaign','beta',true,false,'Create a Meta campaign container in PAUSED state.',jsonb_build_object('runtime','cloudflare-pwa-release-v10','create_paused_only',true))
on conflict (provider_key,capability_key) do update set
  support_status=excluded.support_status,
  write_capable=excluded.write_capable,
  requires_provider_review=excluded.requires_provider_review,
  notes=excluded.notes,
  metadata=excluded.metadata,
  updated_at=now();

create or replace function private.dispatch_automation_job()
returns trigger
language plpgsql
security definer
set search_path to 'public','vault','extensions','pg_temp'
as $function$
declare v_token text; v_provider text; v_url text;
begin
  if new.status <> 'queued' or new.run_after > now() then return new; end if;
  if new.requires_approval and new.approved_by is null then return new; end if;
  select ds.decrypted_secret into v_token
  from public.internal_settings s
  join vault.decrypted_secrets ds on ds.id=s.secret_id
  where s.setting_key='automation_worker_token';
  if v_token is null then return new; end if;
  v_provider := coalesce(new.input->>'provider_key','');
  if new.job_type='crm.mapping.discover' then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/crm-mapping-discovery';
  elsif new.job_type='crm.mapping.configure' then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/connection-mapping-command';
  elsif v_provider='google_ads' then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/cloudflare-pwa-release-v8';
  elsif v_provider='meta_ads' then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/cloudflare-pwa-release-v10';
  elsif v_provider='cloudsales_core' or new.job_type in ('analytics.snapshot','report.generate','support.diagnose','agent.create','agent.update','agent.pause','ecosystem.sync') then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/cloudy-core-command';
  elsif v_provider in ('hubspot','pipedrive','zoho') then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/crm-universal-command';
  elsif v_provider in ('salesforce','microsoft_dynamics','monday_crm') then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/crm-enterprise-command';
  elsif v_provider in ('freshsales','close','copper') then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/crm-smb-command';
  else
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/automation-worker';
  end if;
  perform net.http_post(
    url:=v_url,
    headers:=jsonb_build_object('content-type','application/json','x-cloudsales-worker-token',v_token),
    body:=jsonb_build_object('job_id',new.id)
  );
  return new;
end;
$function$;
