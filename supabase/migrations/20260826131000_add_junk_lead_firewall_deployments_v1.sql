-- Junk Lead Firewall deployment model v1
-- Standardizes client onboarding as resumable, module-level provisioning.

create table if not exists public.firewall_deployments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  template_key text not null default 'junk_lead_firewall_v1',
  template_version integer not null default 1,
  environment text not null default 'production' check (environment in ('sandbox','production')),
  desired_state text not null default 'ready' check (desired_state in ('draft','ready','disabled')),
  actual_state text not null default 'not_started' check (actual_state in ('not_started','configuring','testing','blocked','failed','ready','disabled')),
  capabilities jsonb not null default '{}'::jsonb,
  credentials_status jsonb not null default '{}'::jsonb,
  last_error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, template_key, environment)
);

create table if not exists public.firewall_deployment_checks (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid not null references public.firewall_deployments(id) on delete cascade,
  module text not null check (module in ('edge','validation','crm','attribution','meta','qa')),
  check_key text not null,
  status text not null default 'blocked' check (status in ('pass','fail','blocked','skipped')),
  reason_code text,
  evidence jsonb not null default '{}'::jsonb,
  checked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (deployment_id, check_key)
);

create table if not exists public.firewall_test_runs (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid not null references public.firewall_deployments(id) on delete cascade,
  scenario text not null check (scenario in ('legitimate_lead','bot_or_junk','duplicate','conversion')),
  status text not null default 'blocked' check (status in ('pass','fail','blocked','skipped')),
  reason_code text,
  evidence jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists firewall_deployments_org_idx on public.firewall_deployments(organization_id);
create index if not exists firewall_checks_deployment_idx on public.firewall_deployment_checks(deployment_id);
create index if not exists firewall_test_runs_deployment_idx on public.firewall_test_runs(deployment_id, started_at desc);

alter table public.firewall_deployments enable row level security;
alter table public.firewall_deployment_checks enable row level security;
alter table public.firewall_test_runs enable row level security;

-- Service-role backend owns provisioning. No public grants are added here.

comment on table public.firewall_deployments is 'Resumable, idempotent Junk Lead Firewall client deployments.';
comment on table public.firewall_deployment_checks is 'Module-level PASS/FAIL/BLOCKED/SKIPPED checks for firewall provisioning.';
comment on table public.firewall_test_runs is 'Synthetic acceptance tests: legitimate, bot/junk, duplicate, conversion.';
