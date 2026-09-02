create table if not exists public.integration_aggregator_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_key text not null references public.provider_catalog(provider_key) on delete cascade,
  external_profile_id text,
  status text not null default 'pending' check (status in ('pending','ready','error','disabled')),
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider_key)
);

alter table public.integration_aggregator_profiles enable row level security;
create index if not exists idx_integration_aggregator_profiles_org_provider on public.integration_aggregator_profiles(organization_id, provider_key);
create index if not exists idx_integration_aggregator_profiles_external on public.integration_aggregator_profiles(provider_key, external_profile_id);

comment on table public.integration_aggregator_profiles is 'Internal tenant-to-aggregator profile mapping. Service-role only; never expose provider API credentials to clients.';
