-- CloudSales junk lead archive + suppression guard
create table if not exists public.contact_suppressions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid null references public.contacts(id) on delete set null,
  email_normalized text null,
  phone_normalized text null,
  reason text not null default 'junk_lead',
  active boolean not null default true,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  check (email_normalized is not null or phone_normalized is not null)
);
create unique index if not exists contact_suppressions_org_email_uq on public.contact_suppressions (organization_id,email_normalized) where active and email_normalized is not null;
create unique index if not exists contact_suppressions_org_phone_uq on public.contact_suppressions (organization_id,phone_normalized) where active and phone_normalized is not null;
create index if not exists contact_suppressions_org_active_idx on public.contact_suppressions (organization_id,active);
alter table public.contact_suppressions enable row level security;
revoke all on public.contact_suppressions from anon, authenticated;

create or replace function private.normalize_contact_email(v text) returns text language sql immutable as $$ select nullif(lower(trim(coalesce(v,''))),'') $$;
create or replace function private.normalize_contact_phone(v text) returns text language plpgsql immutable as $$
declare p text; begin p := regexp_replace(coalesce(v,''), '[^0-9]', '', 'g'); if length(p) < 7 then return null; end if; return p; end; $$;

create or replace function private.quarantine_suppressed_contact() returns trigger language plpgsql security definer set search_path=public,private as $$
declare em text; ph text; hit boolean;
begin
  em := private.normalize_contact_email(new.email); ph := private.normalize_contact_phone(new.phone_e164);
  if em is null and ph is null then return new; end if;
  select exists(select 1 from public.contact_suppressions s where s.organization_id=new.organization_id and s.active and ((em is not null and s.email_normalized=em) or (ph is not null and s.phone_normalized=ph)) and (s.contact_id is null or s.contact_id is distinct from new.id)) into hit;
  if hit then
    new.lifecycle_stage := 'archived'; new.quality_status := 'rejected'; new.quality_score := 0;
    new.metadata := coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object('suppressed_reentry',true,'junk_lead',true,'exclude_from_campaigns',true,'suppressed_at',now());
  end if;
  return new;
end; $$;
drop trigger if exists contacts_quarantine_suppressed on public.contacts;
create trigger contacts_quarantine_suppressed before insert or update of email,phone_e164 on public.contacts for each row execute function private.quarantine_suppressed_contact();

create or replace function private.capture_archived_contact_suppression() returns trigger language plpgsql security definer set search_path=public,private as $$
declare em text; ph text;
begin
  if new.lifecycle_stage <> 'archived' then return new; end if;
  em := private.normalize_contact_email(new.email); ph := private.normalize_contact_phone(new.phone_e164);
  new.quality_status := 'rejected'; new.quality_score := 0;
  new.metadata := coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object('archived',true,'archived_at',coalesce(new.metadata->>'archived_at',now()::text),'archived_reason',coalesce(new.metadata->>'archived_reason','junk_lead'),'junk_lead',true,'exclude_from_campaigns',true);
  if em is not null or ph is not null then
    insert into public.contact_suppressions(organization_id,contact_id,email_normalized,phone_normalized,reason,metadata) values(new.organization_id,new.id,em,ph,'junk_lead',jsonb_build_object('source','contact_archive')) on conflict do nothing;
    update public.contact_suppressions set active=true,contact_id=new.id,reason='junk_lead',updated_at=now(),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('source','contact_archive') where organization_id=new.organization_id and ((em is not null and email_normalized=em) or (ph is not null and phone_normalized=ph));
  end if;
  return new;
end; $$;
drop trigger if exists contacts_capture_archive on public.contacts;
create trigger contacts_capture_archive before insert or update of lifecycle_stage on public.contacts for each row execute function private.capture_archived_contact_suppression();

create or replace function private.guard_outbound_suppressed_contact() returns trigger language plpgsql security definer set search_path=public,private as $$
declare c public.contacts%rowtype; em text; ph text; blocked boolean;
begin
  select * into c from public.contacts where id=new.contact_id and organization_id=new.organization_id;
  if not found then return new; end if;
  em := private.normalize_contact_email(c.email); ph := private.normalize_contact_phone(c.phone_e164);
  blocked := c.lifecycle_stage='archived' or coalesce((c.metadata->>'exclude_from_campaigns')::boolean,false) or exists(select 1 from public.contact_suppressions s where s.organization_id=new.organization_id and s.active and ((em is not null and s.email_normalized=em) or (ph is not null and s.phone_normalized=ph)));
  if blocked then new.status := 'skipped'; new.error := 'suppressed_junk_lead'; new.metadata := coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object('suppressed',true,'reason','junk_lead'); end if;
  return new;
end; $$;
drop trigger if exists outbound_recipients_guard_suppressed on public.outbound_campaign_recipients;
create trigger outbound_recipients_guard_suppressed before insert or update of contact_id,status on public.outbound_campaign_recipients for each row execute function private.guard_outbound_suppressed_contact();
