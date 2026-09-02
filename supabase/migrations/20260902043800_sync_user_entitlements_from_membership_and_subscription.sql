create or replace function public.sync_user_entitlements_for_organization(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  s public.subscriptions%rowtype;
  v_trial_end timestamptz;
begin
  select * into s from public.subscriptions where organization_id=p_organization_id;
  if s.id is null then return; end if;

  begin
    v_trial_end := nullif(s.metadata->>'trial_ends_at','')::timestamptz;
  exception when others then
    v_trial_end := null;
  end;
  if v_trial_end is null and s.status='trialing' then v_trial_end:=s.current_period_end; end if;

  insert into public.user_entitlements(
    user_id,organization_id,plan_key,status,sponsored_by_organization,subscription_id,
    provider_customer_id,provider_subscription_id,trial_ends_at,current_period_end,metadata,updated_at
  )
  select
    m.user_id,m.organization_id,s.plan_key,
    case when m.status='active' then s.status else 'cancelled' end,
    true,s.id,s.provider_customer_id,s.provider_subscription_id,v_trial_end,s.current_period_end,
    jsonb_build_object('source','organization_subscription','membership_role',m.role,'billing_provider',s.billing_provider),now()
  from public.organization_members m
  where m.organization_id=p_organization_id and m.status='active'
  on conflict (user_id,organization_id) do update set
    plan_key=excluded.plan_key,
    status=excluded.status,
    sponsored_by_organization=true,
    subscription_id=excluded.subscription_id,
    provider_customer_id=excluded.provider_customer_id,
    provider_subscription_id=excluded.provider_subscription_id,
    trial_ends_at=excluded.trial_ends_at,
    current_period_end=excluded.current_period_end,
    metadata=coalesce(public.user_entitlements.metadata,'{}'::jsonb)||excluded.metadata,
    updated_at=now();

  update public.user_entitlements e
     set status='cancelled',updated_at=now(),metadata=coalesce(e.metadata,'{}'::jsonb)||jsonb_build_object('revoked_reason','inactive_membership')
   where e.organization_id=p_organization_id
     and not exists (
       select 1 from public.organization_members m
       where m.organization_id=e.organization_id and m.user_id=e.user_id and m.status='active'
     )
     and e.status<>'cancelled';
end;
$function$;

create or replace function public.trg_sync_entitlements_from_subscription()
returns trigger language plpgsql set search_path to 'public','pg_temp' as $function$
begin
  perform public.sync_user_entitlements_for_organization(new.organization_id);
  return new;
end;
$function$;

create or replace function public.trg_sync_entitlements_from_membership()
returns trigger language plpgsql set search_path to 'public','pg_temp' as $function$
begin
  perform public.sync_user_entitlements_for_organization(coalesce(new.organization_id,old.organization_id));
  return coalesce(new,old);
end;
$function$;

drop trigger if exists trg_subscription_sync_entitlements on public.subscriptions;
create trigger trg_subscription_sync_entitlements
after insert or update of plan_key,status,billing_provider,provider_customer_id,provider_subscription_id,current_period_end,metadata
on public.subscriptions for each row execute function public.trg_sync_entitlements_from_subscription();

drop trigger if exists trg_membership_sync_entitlements on public.organization_members;
create trigger trg_membership_sync_entitlements
after insert or update of role,status or delete
on public.organization_members for each row execute function public.trg_sync_entitlements_from_membership();

do $$ declare r record; begin
  for r in select id from public.organizations loop
    perform public.sync_user_entitlements_for_organization(r.id);
  end loop;
end $$;
