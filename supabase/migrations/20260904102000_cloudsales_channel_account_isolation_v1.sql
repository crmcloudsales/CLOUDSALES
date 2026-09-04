-- CloudSales channel/provider account isolation.
-- One CloudSales organization owns its own provider connection and channel bindings.
-- Providers remain replaceable behind CloudSales.

begin;

insert into public.provider_catalog(provider_key,display_name,category,auth_type,availability,sort_order,metadata)
values (
  'buffer','Buffer','other','oauth2','beta',115,
  jsonb_build_object(
    'provider_type','social_publishing_api',
    'api_base_url','https://api.buffer.com',
    'tenant_model','one_buffer_account_per_cloudsales_organization',
    'credential_mode','per_organization_oauth_or_api_key',
    'internal_only',true,
    'channels',jsonb_build_array('linkedin','instagram','facebook','threads','x','youtube','pinterest','tiktok','bluesky','google_business')
  )
)
on conflict (provider_key) do update set
  display_name=excluded.display_name,
  category=excluded.category,
  auth_type=excluded.auth_type,
  availability=excluded.availability,
  sort_order=excluded.sort_order,
  metadata=public.provider_catalog.metadata || excluded.metadata,
  updated_at=now();

insert into public.provider_capabilities(provider_key,capability_key,support_status,write_capable,requires_provider_review,notes,metadata)
values
 ('buffer','social.publish','beta',true,false,'Create and publish/queue posts through the organization-owned Buffer account','{}'::jsonb),
 ('buffer','social.read','beta',false,false,'Read Buffer posts, organizations and connected channels','{}'::jsonb),
 ('buffer','social.schedule','beta',true,false,'Schedule posts through Buffer queues','{}'::jsonb)
on conflict (provider_key,capability_key) do update set
 support_status=excluded.support_status,
 write_capable=excluded.write_capable,
 requires_provider_review=excluded.requires_provider_review,
 notes=excluded.notes,
 updated_at=now();

create table if not exists public.channel_provider_bindings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel text not null,
  provider_key text not null references public.provider_catalog(provider_key) on delete restrict,
  connection_id uuid null references public.connections(id) on delete set null,
  provider_account_id text null,
  provider_channel_id text null,
  provider_channel_name text null,
  status text not null default 'pending' check (status in ('pending','connected','needs_attention','disconnected','disabled')),
  inbound_enabled boolean not null default false,
  outbound_enabled boolean not null default true,
  is_primary boolean not null default true,
  capabilities text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, channel, provider_key, provider_channel_id)
);

create unique index if not exists channel_provider_bindings_primary_channel_uidx
  on public.channel_provider_bindings(organization_id, channel)
  where is_primary = true and status <> 'disabled';

create index if not exists channel_provider_bindings_connection_idx
  on public.channel_provider_bindings(connection_id);

alter table public.channel_provider_bindings enable row level security;

create policy channel_provider_bindings_select_member
on public.channel_provider_bindings for select to authenticated
using (exists (
  select 1 from public.organization_members m
  where m.organization_id=channel_provider_bindings.organization_id
    and m.user_id=auth.uid() and m.status='active'
));

create policy channel_provider_bindings_manage_admin
on public.channel_provider_bindings for all to authenticated
using (exists (
  select 1 from public.organization_members m
  where m.organization_id=channel_provider_bindings.organization_id
    and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin','operator')
))
with check (exists (
  select 1 from public.organization_members m
  where m.organization_id=channel_provider_bindings.organization_id
    and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin','operator')
));

create or replace function public.set_channel_provider_bindings_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;

drop trigger if exists channel_provider_bindings_updated_at on public.channel_provider_bindings;
create trigger channel_provider_bindings_updated_at before update on public.channel_provider_bindings
for each row execute function public.set_channel_provider_bindings_updated_at();
revoke all on function public.set_channel_provider_bindings_updated_at() from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='organization_channel_identities' and column_name='connection_id'
  ) then
    alter table public.organization_channel_identities
      add column connection_id uuid null references public.connections(id) on delete set null;
  end if;
end $$;

create index if not exists organization_channel_identities_connection_idx
  on public.organization_channel_identities(connection_id);

insert into public.integration_provider_routes(capability_key,provider_key,route_type,priority,enabled,minimum_support_status,quality_weight,cost_weight,latency_weight,metadata)
values
 ('social.publish','zernio','aggregator',10,true,'beta',1,1,1,jsonb_build_object('scope','per_organization_profile','channel_binding_required',true)),
 ('social.read','zernio','aggregator',10,true,'beta',1,1,1,jsonb_build_object('scope','per_organization_profile','channel_binding_required',true)),
 ('social.publish','buffer','direct',20,true,'beta',1,1,1,jsonb_build_object('scope','per_organization_account','channel_binding_required',true)),
 ('social.read','buffer','direct',20,true,'beta',1,1,1,jsonb_build_object('scope','per_organization_account','channel_binding_required',true)),
 ('social.schedule','buffer','direct',20,true,'beta',1,1,1,jsonb_build_object('scope','per_organization_account','channel_binding_required',true))
on conflict (capability_key,provider_key) do update set
 route_type=excluded.route_type,
 priority=excluded.priority,
 enabled=excluded.enabled,
 minimum_support_status=excluded.minimum_support_status,
 metadata=public.integration_provider_routes.metadata || excluded.metadata,
 updated_at=now();

create or replace function private.validate_channel_provider_binding()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare c_org uuid; c_provider text; c_status text;
begin
  if new.connection_id is null then
    if new.status='connected' then raise exception 'connected_binding_requires_connection'; end if;
    return new;
  end if;
  select organization_id,provider_key,status into c_org,c_provider,c_status
  from public.connections where id=new.connection_id;
  if c_org is null then raise exception 'connection_not_found'; end if;
  if c_org<>new.organization_id then raise exception 'cross_tenant_connection_forbidden'; end if;
  if c_provider<>new.provider_key then raise exception 'provider_connection_mismatch'; end if;
  if new.status='connected' and c_status<>'connected' then raise exception 'binding_connection_not_connected'; end if;
  return new;
end $$;
revoke all on function private.validate_channel_provider_binding() from public, anon, authenticated;

drop trigger if exists trg_validate_channel_provider_binding on public.channel_provider_bindings;
create trigger trg_validate_channel_provider_binding
before insert or update of organization_id,provider_key,connection_id,status
on public.channel_provider_bindings
for each row execute function private.validate_channel_provider_binding();

commit;
