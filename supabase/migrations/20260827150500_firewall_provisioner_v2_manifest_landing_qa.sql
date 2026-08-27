-- Firewall Provisioner v2
-- Adds persisted client manifests/resources, Secure Campaign Landing state,
-- and GOOD / SUSPICIOUS / BOT synthetic QA scenarios.

alter table public.firewall_deployments
  add column if not exists manifest jsonb not null default '{}'::jsonb,
  add column if not exists resources jsonb not null default '{}'::jsonb,
  add column if not exists current_step text,
  add column if not exists run_token uuid,
  add column if not exists run_started_at timestamptz,
  add column if not exists ready_at timestamptz;

create table if not exists public.firewall_campaign_landings (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid not null unique references public.firewall_deployments(id) on delete cascade,
  organization_id uuid not null,
  hostname text not null unique,
  zone_id text,
  zone_name text,
  worker_name text,
  worker_domain_id text,
  waf_ruleset_id text,
  waf_rule_id text,
  turnstile_sitekey text,
  turnstile_secret_secret_id uuid,
  qa_token_secret_id uuid,
  gate_id uuid,
  gate_public_key uuid,
  status text not null default 'configuring' check (status in ('configuring','blocked','failed','ready','disabled')),
  landing_config jsonb not null default '{}'::jsonb,
  provider_evidence jsonb not null default '{}'::jsonb,
  last_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists firewall_campaign_landings_org_idx
  on public.firewall_campaign_landings(organization_id);

alter table public.firewall_campaign_landings enable row level security;

alter table public.firewall_test_runs
  drop constraint if exists firewall_test_runs_scenario_check;

alter table public.firewall_test_runs
  add constraint firewall_test_runs_scenario_check
  check (scenario in (
    'legitimate_lead','bot_or_junk','duplicate','conversion',
    'good','suspicious','bot'
  ));

comment on column public.firewall_deployments.manifest is
  'Canonical client deployment manifest consumed idempotently by firewall-provisioner.';
comment on column public.firewall_deployments.resources is
  'Provider resource identifiers created or adopted by firewall-provisioner.';
comment on table public.firewall_campaign_landings is
  'Secure Campaign Landing provisioning state: hostname, Worker, WAF, Turnstile and gate bindings.';
