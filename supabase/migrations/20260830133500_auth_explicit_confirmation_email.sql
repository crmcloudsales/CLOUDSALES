-- CloudSales signup email authorization is recorded before auth.signUp/auth.resend.
-- Before signup there is no auth.users row yet, so user_id must be nullable only for
-- the two narrowly-scoped signup confirmation purposes.

alter table public.email_send_authorizations
  alter column user_id drop not null;

alter table public.email_send_authorizations
  drop constraint if exists email_send_authorizations_actor_scope_check;

alter table public.email_send_authorizations
  add constraint email_send_authorizations_actor_scope_check
  check (
    user_id is not null
    or purpose in ('signup_confirmation','signup_confirmation_resend')
  );

-- This ledger is service-only. RLS remains enabled with no client write policy.
alter table public.email_send_authorizations enable row level security;

comment on table public.email_send_authorizations is
  'Auditable one-send email authorizations. Anonymous actor rows are allowed only for signup confirmation/resend before an auth user exists.';
