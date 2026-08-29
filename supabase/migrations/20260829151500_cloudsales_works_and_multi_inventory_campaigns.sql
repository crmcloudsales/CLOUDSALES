-- CloudSales Works + multi-inventory campaign model

create table if not exists public.marketing_campaign_inventory_items (
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  relationship text not null default 'promoted' check (relationship in ('promoted','primary','supporting','excluded')),
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (campaign_id, inventory_item_id)
);

create index if not exists marketing_campaign_inventory_org_idx
  on public.marketing_campaign_inventory_items(organization_id, campaign_id, position);
create index if not exists marketing_campaign_inventory_item_idx
  on public.marketing_campaign_inventory_items(organization_id, inventory_item_id);

create or replace function public.validate_marketing_campaign_inventory_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  campaign_org uuid;
  item_org uuid;
begin
  select organization_id into campaign_org from public.marketing_campaigns where id = new.campaign_id;
  select organization_id into item_org from public.inventory_items where id = new.inventory_item_id;
  if campaign_org is null or item_org is null then
    raise exception 'campaign_or_inventory_item_not_found';
  end if;
  if campaign_org <> item_org or new.organization_id <> campaign_org then
    raise exception 'cross_tenant_campaign_inventory_link_blocked';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_marketing_campaign_inventory_tenant() from public, anon, authenticated;

drop trigger if exists marketing_campaign_inventory_tenant_gate on public.marketing_campaign_inventory_items;
create trigger marketing_campaign_inventory_tenant_gate
before insert or update on public.marketing_campaign_inventory_items
for each row execute function public.validate_marketing_campaign_inventory_tenant();

alter table public.marketing_campaign_inventory_items enable row level security;
grant select, insert, update, delete on public.marketing_campaign_inventory_items to authenticated;
grant all on public.marketing_campaign_inventory_items to service_role;

drop policy if exists marketing_campaign_inventory_select_member on public.marketing_campaign_inventory_items;
create policy marketing_campaign_inventory_select_member
on public.marketing_campaign_inventory_items for select to authenticated
using (private.is_org_member(organization_id));

drop policy if exists marketing_campaign_inventory_write_operator on public.marketing_campaign_inventory_items;
create policy marketing_campaign_inventory_write_operator
on public.marketing_campaign_inventory_items for all to authenticated
using (private.has_org_role(organization_id, array['owner','admin','operator']))
with check (private.has_org_role(organization_id, array['owner','admin','operator']));

create table if not exists public.work_catalog (
  work_key text primary key,
  category text not null,
  name_en text not null,
  name_es text not null,
  description_en text,
  description_es text,
  unit text not null,
  pricing_mode text not null default 'per_unit' check (pricing_mode in ('per_unit','flat','pass_through_markup')),
  base_price_usd numeric(12,4) not null check (base_price_usd >= 0),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.work_catalog enable row level security;
grant select on public.work_catalog to authenticated;
grant all on public.work_catalog to service_role;

drop policy if exists work_catalog_read_active on public.work_catalog;
create policy work_catalog_read_active
on public.work_catalog for select to authenticated
using (active = true);

create table if not exists public.work_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_key text not null references public.work_catalog(work_key),
  quantity numeric(14,4) not null check (quantity > 0),
  unit_price_usd numeric(12,4) not null check (unit_price_usd >= 0),
  amount_usd numeric(14,4) generated always as (round(quantity * unit_price_usd, 4)) stored,
  provider_cost_usd numeric(14,6),
  status text not null default 'posted' check (status in ('estimated','posted','reversed')),
  source_type text,
  source_id text,
  idempotency_key text not null unique,
  occurred_at timestamptz not null default now(),
  reversed_by uuid references public.work_ledger(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists work_ledger_org_time_idx
  on public.work_ledger(organization_id, occurred_at desc);
create index if not exists work_ledger_org_key_idx
  on public.work_ledger(organization_id, work_key, occurred_at desc);

alter table public.work_ledger enable row level security;
grant select on public.work_ledger to authenticated;
grant all on public.work_ledger to service_role;

drop policy if exists work_ledger_read_member on public.work_ledger;
create policy work_ledger_read_member
on public.work_ledger for select to authenticated
using (private.is_org_member(organization_id));

insert into public.work_catalog(
  work_key, category, name_en, name_es, description_en, description_es,
  unit, pricing_mode, base_price_usd, active, metadata
) values (
  'brochure.send',
  'messaging',
  'Brochure delivery',
  'Envío de brochure',
  'Cloudy sends an approved brochure to a lead through an enabled messaging channel.',
  'Cloudy envía un brochure aprobado a un lead mediante un canal de mensajería habilitado.',
  'message',
  'per_unit',
  0.65,
  true,
  jsonb_build_object('source','product_decision_2026_08_29','charge_only_on_success',true)
)
on conflict (work_key) do update set
  category=excluded.category,
  name_en=excluded.name_en,
  name_es=excluded.name_es,
  description_en=excluded.description_en,
  description_es=excluded.description_es,
  unit=excluded.unit,
  pricing_mode=excluded.pricing_mode,
  base_price_usd=excluded.base_price_usd,
  active=excluded.active,
  metadata=excluded.metadata,
  updated_at=now();

create or replace function public.service_post_work(
  p_organization_id uuid,
  p_work_key text,
  p_quantity numeric,
  p_source_type text,
  p_source_id text,
  p_idempotency_key text,
  p_provider_cost_usd numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.work_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  catalog public.work_catalog%rowtype;
  existing public.work_ledger%rowtype;
  posted public.work_ledger%rowtype;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'work_quantity_must_be_positive';
  end if;
  if nullif(trim(coalesce(p_idempotency_key,'')), '') is null then
    raise exception 'work_idempotency_key_required';
  end if;

  select * into existing from public.work_ledger where idempotency_key = p_idempotency_key;
  if existing.id is not null then
    return existing;
  end if;

  select * into catalog from public.work_catalog where work_key = p_work_key and active = true;
  if catalog.work_key is null then
    raise exception 'work_not_configured';
  end if;

  insert into public.work_ledger(
    organization_id, work_key, quantity, unit_price_usd, provider_cost_usd,
    status, source_type, source_id, idempotency_key, metadata
  ) values (
    p_organization_id, p_work_key, p_quantity, catalog.base_price_usd, p_provider_cost_usd,
    'posted', nullif(trim(p_source_type),''), nullif(trim(p_source_id),''), p_idempotency_key,
    coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('catalog_price_usd',catalog.base_price_usd,'unit',catalog.unit)
  ) returning * into posted;
  return posted;
end;
$$;

revoke all on function public.service_post_work(uuid,text,numeric,text,text,text,numeric,jsonb) from public, anon, authenticated;
grant execute on function public.service_post_work(uuid,text,numeric,text,text,text,numeric,jsonb) to service_role;

comment on table public.work_ledger is 'Immutable customer-facing CloudSales Works ledger. Posted only for successful configured work.';
comment on table public.marketing_campaign_inventory_items is 'Many-to-many mapping so one campaign may promote one or many tenant inventory items and every tenant may run many campaigns.';
