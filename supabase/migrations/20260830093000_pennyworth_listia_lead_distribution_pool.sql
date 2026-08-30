create table if not exists public.lead_distribution_pool (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  gate_id uuid references public.gate_configs(id) on delete set null,
  lead_attempt_id uuid not null references public.lead_attempts(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  source_brand text not null default 'pennyworth',
  source_channel text not null default 'landing_form',
  target_product text not null default 'listia',
  recipient_strategy text not null default 'eligible_listia_subscribers',
  eligibility_status text not null default 'eligible',
  distribution_status text not null default 'queued',
  consent_basis text not null default 'form_submission_terms',
  quality_score smallint,
  source_provider text,
  campaign_id text,
  ad_group_id text,
  ad_id text,
  landing_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_attempt_id),
  constraint lead_distribution_pool_eligibility_check check (eligibility_status in ('eligible','review','blocked')),
  constraint lead_distribution_pool_status_check check (distribution_status in ('queued','held','matched','assigned','delivered','rejected'))
);

create index if not exists lead_distribution_pool_target_status_idx
  on public.lead_distribution_pool (target_product, distribution_status, eligibility_status, created_at desc);

create index if not exists lead_distribution_pool_contact_idx
  on public.lead_distribution_pool (contact_id, created_at desc);

alter table public.lead_distribution_pool enable row level security;

revoke all on table public.lead_distribution_pool from anon, authenticated;
grant all on table public.lead_distribution_pool to service_role;

create or replace function public.enqueue_accepted_lead_for_distribution()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hostname text;
  v_form_key text;
  v_channel text;
  v_eligibility text;
  v_status text;
begin
  if new.decision <> 'accept' or new.accepted_contact_id is null then
    return new;
  end if;

  select hostname
    into v_hostname
  from public.gate_configs
  where id = new.gate_id;

  if v_hostname is distinct from 'pennyworth.cloudsales.app' then
    return new;
  end if;

  v_form_key := coalesce(new.metadata->>'form_id', 'landing_main_v1');

  v_channel := case
    when v_form_key ilike '%whatsapp%' then 'whatsapp'
    when v_form_key ilike '%chat%' then 'chat'
    else 'landing_form'
  end;

  v_eligibility := case
    when coalesce(new.quality_score, 0) >= 70 then 'eligible'
    when coalesce(new.quality_score, 0) >= 60 then 'review'
    else 'blocked'
  end;

  v_status := case when v_eligibility = 'eligible' then 'queued' else 'held' end;

  insert into public.lead_distribution_pool (
    organization_id,
    gate_id,
    lead_attempt_id,
    contact_id,
    source_brand,
    source_channel,
    target_product,
    recipient_strategy,
    eligibility_status,
    distribution_status,
    consent_basis,
    quality_score,
    source_provider,
    campaign_id,
    ad_group_id,
    ad_id,
    landing_url,
    metadata,
    updated_at
  )
  values (
    new.organization_id,
    new.gate_id,
    new.id,
    new.accepted_contact_id,
    'pennyworth',
    v_channel,
    'listia',
    'eligible_listia_subscribers',
    v_eligibility,
    v_status,
    case
      when v_channel in ('chat','whatsapp') then 'explicit_required_checkbox'
      else 'form_submission_terms'
    end,
    new.quality_score,
    new.source_provider,
    new.campaign_id,
    new.ad_group_id,
    new.ad_id,
    new.landing_url,
    jsonb_build_object(
      'form_key', v_form_key,
      'edge_verified', coalesce((new.metadata->>'edge_verified')::boolean, false),
      'source_attempt_id', new.id
    ),
    now()
  )
  on conflict (lead_attempt_id) do update
  set contact_id = excluded.contact_id,
      source_channel = excluded.source_channel,
      eligibility_status = excluded.eligibility_status,
      distribution_status = excluded.distribution_status,
      quality_score = excluded.quality_score,
      source_provider = excluded.source_provider,
      campaign_id = excluded.campaign_id,
      ad_group_id = excluded.ad_group_id,
      ad_id = excluded.ad_id,
      landing_url = excluded.landing_url,
      metadata = excluded.metadata,
      updated_at = now();

  return new;
end;
$$;

revoke all on function public.enqueue_accepted_lead_for_distribution() from public, anon, authenticated;
grant execute on function public.enqueue_accepted_lead_for_distribution() to service_role;

drop trigger if exists trg_enqueue_accepted_lead_for_distribution on public.lead_attempts;
create trigger trg_enqueue_accepted_lead_for_distribution
after insert or update of decision, accepted_contact_id, quality_score, metadata
on public.lead_attempts
for each row
execute function public.enqueue_accepted_lead_for_distribution();
