create or replace function private.dispatch_automation_job()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'vault', 'extensions', 'pg_temp'
as $function$
declare
  v_token text;
  v_provider text;
  v_connection_provider text;
  v_url text;
  v_function_slug text;
  v_support_status text;
begin
  if new.status <> 'queued' or new.run_after > now() then return new; end if;
  if new.requires_approval and new.approved_by is null then return new; end if;

  select ds.decrypted_secret into v_token
  from public.internal_settings s
  join vault.decrypted_secrets ds on ds.id = s.secret_id
  where s.setting_key = 'automation_worker_token';
  if v_token is null then return new; end if;

  v_provider := coalesce(new.input->>'provider_key','');

  if coalesce(new.input->>'connection_id','') <> '' then
    select c.provider_key into v_connection_provider
    from public.connections c
    where c.id::text = new.input->>'connection_id'
      and c.organization_id = new.organization_id
      and c.status = 'connected'
    limit 1;
    if coalesce(v_connection_provider,'') <> '' then
      v_provider := v_connection_provider;
    end if;
  end if;

  if new.job_type = 'crm.mapping.discover' then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/crm-mapping-discovery';
  elsif new.job_type = 'crm.mapping.configure' then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/connection-mapping-command';
  elsif v_provider = 'google_ads' then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/cloudflare-pwa-release-v8';
  elsif v_provider = 'meta_ads' then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/cloudflare-pwa-release-v10';
  elsif v_provider = 'cloudsales_core' or new.job_type in ('analytics.snapshot','report.generate','support.diagnose','agent.create','agent.update','agent.pause','ecosystem.sync') then
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/cloudy-core-command';
  else
    select pc.support_status into v_support_status
    from public.provider_capabilities pc
    where pc.provider_key = v_provider
      and pc.capability_key = new.job_type
    limit 1;

    if v_support_status not in ('implemented','beta') then
      return new;
    end if;

    select r.metadata->>'function_slug' into v_function_slug
    from public.integration_provider_routes r
    where r.provider_key = v_provider
      and r.capability_key = new.job_type
      and r.enabled = true
    order by r.priority asc
    limit 1;

    if coalesce(v_function_slug,'') = '' then
      v_function_slug := case
        when v_provider = 'highlevel' then 'automation-worker'
        when v_provider in ('hubspot','pipedrive','zoho') then 'crm-universal-command'
        when v_provider in ('salesforce','microsoft_dynamics','monday_crm') then 'crm-enterprise-command'
        when v_provider in ('freshsales','close','copper') then 'crm-smb-command'
        else null
      end;
    end if;

    if coalesce(v_function_slug,'') = '' then return new; end if;
    v_url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/' || v_function_slug;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('content-type','application/json','x-cloudsales-worker-token',v_token),
    body := jsonb_build_object('job_id',new.id)
  );
  return new;
end;
$function$;
