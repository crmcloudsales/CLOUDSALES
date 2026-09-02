create or replace function public.guard_subscription_trial_status()
returns trigger
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  v_trial_end timestamptz;
begin
  if new.billing_provider='stripe' and new.status='active' then
    begin
      v_trial_end := nullif(new.metadata->>'trial_ends_at','')::timestamptz;
    exception when others then
      v_trial_end := null;
    end;
    if v_trial_end is not null and v_trial_end > now() then
      new.status := 'trialing';
      if new.current_period_start is null then
        begin
          new.current_period_start := nullif(new.metadata->>'trial_started_at','')::timestamptz;
        exception when others then
          null;
        end;
      end if;
      if new.current_period_end is null then new.current_period_end := v_trial_end; end if;
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_guard_subscription_trial_status on public.subscriptions;
create trigger trg_guard_subscription_trial_status
before insert or update of status,current_period_start,current_period_end,metadata,billing_provider
on public.subscriptions
for each row execute function public.guard_subscription_trial_status();
