-- Expose real Meta/Google Ads actions to Cloudy and route queued jobs to the correct provider adapters.

insert into public.provider_capabilities(provider_key,capability_key,support_status,write_capable,requires_provider_review,notes,metadata)
values
  ('meta','ads.meta.accounts','beta',false,false,'Read authorized Meta ad accounts.',jsonb_build_object('runtime','cloudy-core-command')),
  ('meta','ads.meta.account.select','beta',true,false,'Select the Meta ad account for this tenant.',jsonb_build_object('runtime','cloudy-core-command')),
  ('meta','ads.meta.sync','beta',false,false,'Synchronize campaigns, spend and provider state from Meta.',jsonb_build_object('runtime','cloudy-core-command')),
  ('meta','ads.meta.pause','beta',true,false,'Pause a Meta campaign and verify provider state.',jsonb_build_object('runtime','cloudy-core-command')),
  ('meta','ads.meta.resume','beta',true,false,'Resume a Meta campaign and verify provider state.',jsonb_build_object('runtime','cloudy-core-command')),
  ('meta','ads.meta.budget','beta',true,false,'Change Meta campaign budget and verify provider state.',jsonb_build_object('runtime','cloudy-core-command')),
  ('meta','ads.meta.create_campaign','beta',true,false,'Create a Meta campaign container under approval controls.',jsonb_build_object('runtime','cloudy-core-command'))
on conflict (provider_key,capability_key) do update set
  support_status=excluded.support_status,
  write_capable=excluded.write_capable,
  requires_provider_review=excluded.requires_provider_review,
  notes=excluded.notes,
  metadata=excluded.metadata,
  updated_at=now();

insert into public.cloudy_action_catalog(action_key,category,risk_level,requires_approval,enabled,description)
values
  ('ads.meta.accounts','advertising','low',false,true,'Read authorized Meta ad accounts.'),
  ('ads.meta.account.select','advertising','medium',true,true,'Select the Meta ad account CloudSales should manage.'),
  ('ads.meta.sync','advertising','low',false,true,'Synchronize Meta campaigns and performance.'),
  ('ads.meta.pause','advertising','medium',true,true,'Pause a Meta campaign.'),
  ('ads.meta.resume','advertising','high',true,true,'Enable a Meta campaign that can spend money.'),
  ('ads.meta.budget','advertising','high',true,true,'Change Meta campaign budget.'),
  ('ads.meta.create_campaign','advertising','medium',true,true,'Create a Meta campaign container.')
on conflict (action_key) do update set
  category=excluded.category,
  risk_level=excluded.risk_level,
  requires_approval=excluded.requires_approval,
  enabled=excluded.enabled,
  description=excluded.description,
  updated_at=now();

-- Action-catalog approval is authoritative; provider-review flags must not force approval on read-only Google actions.
update public.provider_capabilities
set requires_provider_review=false, updated_at=now()
where provider_key='google_ads' and capability_key in (
  'ads.google.accounts','ads.google.account.select','ads.google.sync','ads.google.pause','ads.google.resume','ads.google.budget','ads.google.create_campaign'
);

-- Billing is a UI/provider-portal handoff, not a Cloudy executable server action.
update public.provider_capabilities
set support_status='planned', updated_at=now()
where provider_key='google_ads' and capability_key='ads.google.billing.manage';

update public.provider_catalog
set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
  'worker_runtime_slug','cloudflare-pwa-release-v8',
  'worker_runtime_source','supabase/functions/google-ads-worker/index.ts',
  'worker_runtime_slot_reclaimed_from','cloudsales-pwa-v8',
  'worker_runtime_slot_reclaimed_at','2026-08-29T21:30:00Z'
),updated_at=now()
where provider_key='google_ads';

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
  elsif v_provider='meta' then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/cloudy-core-command';
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
