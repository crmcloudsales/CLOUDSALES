alter table public.organization_claim_tokens add column if not exists expected_email text;

alter table public.organization_claim_tokens drop constraint if exists organization_claim_tokens_expected_email_check;
alter table public.organization_claim_tokens add constraint organization_claim_tokens_expected_email_check
check (
  expected_email is null
  or (
    expected_email = lower(btrim(expected_email))
    and expected_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);

create index if not exists idx_org_claim_tokens_expected_email_active
on public.organization_claim_tokens (lower(expected_email))
where expected_email is not null and consumed_at is null;
