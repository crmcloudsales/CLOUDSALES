create unique index if not exists opportunities_lead_attempt_unique_idx
on public.opportunities (organization_id, ((metadata->>'lead_attempt_id')))
where metadata ? 'lead_attempt_id';

create or replace function public.materialize_accepted_lead_opportunity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_connection_id uuid;
  v_pipeline jsonb;
  v_opportunity_id uuid;
  v_name text;
  v_contact_name text;
  v_property_name text;
  v_interest text;
begin
  if new.decision <> 'accept' or new.accepted_contact_id is null then
    return new;
  end if;

  if exists (
    select 1 from public.opportunities
    where organization_id = new.organization_id
      and metadata->>'lead_attempt_id' = new.id::text
  ) then
    return new;
  end if;

  select nullif(btrim(concat_ws(' ', c.first_name, c.last_name)), '')
    into v_contact_name
  from public.contacts c
  where c.id = new.accepted_contact_id
    and c.organization_id = new.organization_id;

  v_property_name := nullif(btrim(coalesce(new.metadata #>> '{lead_context,property,name}', '')), '');
  v_interest := nullif(btrim(coalesce(new.metadata #>> '{lead_context,interest}', '')), '');
  v_name := coalesce(v_property_name, v_interest, v_contact_name, 'New Lead');

  insert into public.opportunities (
    organization_id,
    contact_id,
    name,
    stage,
    status,
    currency,
    metadata
  ) values (
    new.organization_id,
    new.accepted_contact_id,
    left(v_name, 180),
    'New Lead',
    'open',
    'USD',
    jsonb_build_object(
      'source', 'cloudsales_lead_intake',
      'lead_attempt_id', new.id,
      'gate_id', new.gate_id,
      'quality_score', new.quality_score,
      'property', coalesce(new.metadata #> '{lead_context,property}', 'null'::jsonb),
      'interest', new.metadata #>> '{lead_context,interest}',
      'created_automatically', true
    )
  )
  returning id into v_opportunity_id;

  select g.primary_crm_connection_id
    into v_connection_id
  from public.gate_configs g
  where g.id = new.gate_id
    and g.organization_id = new.organization_id
    and g.status = 'active';

  if v_connection_id is not null then
    select cm.config
      into v_pipeline
    from public.connection_mappings cm
    where cm.connection_id = v_connection_id
      and cm.organization_id = new.organization_id
      and cm.mapping_type = 'pipeline'
      and cm.mapping_key = 'cloudsales_sales'
      and cm.status = 'active'
    limit 1;

    if nullif(v_pipeline->>'external_id', '') is not null
       and nullif(v_pipeline #>> '{stages,New Lead}', '') is not null then
      insert into public.automation_jobs (
        organization_id,
        job_type,
        status,
        requires_approval,
        input
      ) values (
        new.organization_id,
        'crm.opportunity.create',
        'queued',
        false,
        jsonb_build_object(
          'opportunity_id', v_opportunity_id,
          'connection_id', v_connection_id,
          'pipeline_id', v_pipeline->>'external_id',
          'pipeline_stage_id', v_pipeline #>> '{stages,New Lead}',
          'lead_attempt_id', new.id,
          'source', 'accepted_lead_auto_opportunity_v1'
        )
      );
    end if;
  end if;

  return new;
exception
  when unique_violation then
    return new;
end;
$$;

revoke all on function public.materialize_accepted_lead_opportunity() from public, anon, authenticated;
grant execute on function public.materialize_accepted_lead_opportunity() to service_role;

drop trigger if exists trg_materialize_accepted_lead_opportunity on public.lead_attempts;
create trigger trg_materialize_accepted_lead_opportunity
after insert or update of decision, accepted_contact_id
on public.lead_attempts
for each row
execute function public.materialize_accepted_lead_opportunity();
