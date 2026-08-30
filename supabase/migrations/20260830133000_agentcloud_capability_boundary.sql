-- AgentCloud hard execution boundary.
-- A delegated specialist may only create Cloudy jobs explicitly listed in its capabilities.

create or replace function public.enforce_agentcloud_job_capability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent_id uuid;
  v_agent_status text;
  v_agent_org uuid;
  v_capabilities text[];
begin
  if coalesce(new.input->>'requested_via','') <> 'cloudy-orchestrator' then
    return new;
  end if;

  if nullif(new.input->>'agent_id','') is null then
    return new;
  end if;

  begin
    v_agent_id := (new.input->>'agent_id')::uuid;
  exception when others then
    raise exception 'agentcloud_invalid_agent_id' using errcode = '42501';
  end;

  select organization_id,status,capabilities
    into v_agent_org,v_agent_status,v_capabilities
  from public.cloudy_agents
  where id = v_agent_id;

  if v_agent_org is null
     or v_agent_org <> new.organization_id
     or v_agent_status <> 'active' then
    raise exception 'agentcloud_agent_not_active_for_workspace' using errcode = '42501';
  end if;

  if not (new.job_type = any(coalesce(v_capabilities,array[]::text[]))) then
    raise exception 'agentcloud_capability_not_allowed:%', new.job_type using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_agentcloud_job_capability() from public;
revoke all on function public.enforce_agentcloud_job_capability() from anon;
revoke all on function public.enforce_agentcloud_job_capability() from authenticated;
grant execute on function public.enforce_agentcloud_job_capability() to service_role;

drop trigger if exists trg_agentcloud_job_capability on public.automation_jobs;
create trigger trg_agentcloud_job_capability
before insert or update of organization_id,job_type,input on public.automation_jobs
for each row execute function public.enforce_agentcloud_job_capability();

-- Marketing Agent may operate advertising only through explicit provider actions.
-- Provider connection, workspace role and approval checks remain separate mandatory gates.
update public.cloudy_agent_templates
set capabilities = array[
  'campaign.read',
  'analytics.snapshot',
  'report.generate',
  'signal.crm_event.send',
  'ads.meta.accounts',
  'ads.meta.account.select',
  'ads.meta.sync',
  'ads.meta.pause',
  'ads.meta.resume',
  'ads.meta.budget',
  'ads.meta.create_campaign',
  'ads.google.accounts',
  'ads.google.account.select',
  'ads.google.sync',
  'ads.google.pause',
  'ads.google.resume',
  'ads.google.budget',
  'ads.google.create_campaign'
], updated_at = now()
where template_key = 'marketing_analyst';

update public.cloudy_agents
set capabilities = array[
  'campaign.read',
  'analytics.snapshot',
  'report.generate',
  'signal.crm_event.send',
  'ads.meta.accounts',
  'ads.meta.account.select',
  'ads.meta.sync',
  'ads.meta.pause',
  'ads.meta.resume',
  'ads.meta.budget',
  'ads.meta.create_campaign',
  'ads.google.accounts',
  'ads.google.account.select',
  'ads.google.sync',
  'ads.google.pause',
  'ads.google.resume',
  'ads.google.budget',
  'ads.google.create_campaign'
], updated_at = now()
where template_key = 'marketing_analyst' and status = 'active';
