create or replace function private.claim_cloudsales_checkout(p_organization_id uuid, p_session_id text, p_user_email text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  cs public.checkout_sessions%rowtype;
  bi public.billable_items%rowtype;
  v_trial_days integer := 0;
  v_trial_start timestamptz;
  v_trial_end timestamptz;
  v_subscription_status text;
begin
  select * into cs from public.checkout_sessions where stripe_session_id=p_session_id for update;
  if cs.id is null then raise exception 'checkout_not_found'; end if;
  if cs.status not in ('complete','claimed') then raise exception 'checkout_not_complete'; end if;
  if cs.organization_id is not null and cs.organization_id <> p_organization_id then raise exception 'checkout_already_claimed'; end if;
  if cs.email is not null and p_user_email is not null and lower(cs.email) <> lower(p_user_email) then raise exception 'checkout_email_mismatch'; end if;

  select * into bi from public.billable_items where item_key=cs.item_key;
  v_trial_days := case when bi.category='subscription' then greatest(0,coalesce((bi.metadata->>'trial_days')::integer,0)) else 0 end;
  v_trial_start := coalesce(cs.completed_at, now());
  v_trial_end := case when v_trial_days > 0 then v_trial_start + make_interval(days => v_trial_days) else null end;
  v_subscription_status := case when v_trial_days > 0 then 'trialing' else 'active' end;

  update public.checkout_sessions
     set organization_id=p_organization_id,
         status='claimed',
         claimed_at=coalesce(claimed_at,now()),
         metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
           'trial_days',v_trial_days,
           'billing_phase',v_subscription_status,
           'trial_started_at',case when v_trial_days>0 then to_jsonb(v_trial_start) else 'null'::jsonb end,
           'trial_ends_at',case when v_trial_days>0 then to_jsonb(v_trial_end) else 'null'::jsonb end
         )
   where id=cs.id;

  if bi.category='subscription' then
    update public.organizations set plan_key=coalesce(bi.metadata->>'plan_key',plan_key) where id=p_organization_id;
    insert into public.subscriptions(
      organization_id,plan_key,status,billing_provider,external_customer_id,external_subscription_id,
      provider_customer_id,provider_subscription_id,provider_product_id,provider_price_id,brand_key,billing_cohort,
      current_period_start,current_period_end,metadata
    ) values(
      p_organization_id,coalesce(bi.metadata->>'plan_key','pro'),v_subscription_status,'stripe',cs.stripe_customer_id,cs.stripe_subscription_id,
      cs.stripe_customer_id,cs.stripe_subscription_id,bi.stripe_product_id,bi.stripe_price_id,'cloudsales','first_100',
      v_trial_start,case when v_trial_days>0 then v_trial_end else null end,
      jsonb_build_object(
        'checkout_session_id',p_session_id,
        'item_key',cs.item_key,
        'billing_phase',v_subscription_status,
        'trial_days',v_trial_days,
        'trial_started_at',case when v_trial_days>0 then to_jsonb(v_trial_start) else 'null'::jsonb end,
        'trial_ends_at',case when v_trial_days>0 then to_jsonb(v_trial_end) else 'null'::jsonb end,
        'payment_method_required',coalesce((bi.metadata->>'trial_requires_payment_method')::boolean,false)
      )
    )
    on conflict (organization_id) do update set
      plan_key=excluded.plan_key,
      status=excluded.status,
      billing_provider='stripe',
      external_customer_id=excluded.external_customer_id,
      external_subscription_id=excluded.external_subscription_id,
      provider_customer_id=excluded.provider_customer_id,
      provider_subscription_id=excluded.provider_subscription_id,
      provider_product_id=excluded.provider_product_id,
      provider_price_id=excluded.provider_price_id,
      brand_key='cloudsales',
      billing_cohort='first_100',
      current_period_start=excluded.current_period_start,
      current_period_end=excluded.current_period_end,
      metadata=coalesce(public.subscriptions.metadata,'{}'::jsonb) || excluded.metadata,
      updated_at=now();
  end if;

  return jsonb_build_object(
    'item_key',cs.item_key,
    'category',bi.category,
    'organization_id',p_organization_id,
    'status','claimed',
    'billing_phase',v_subscription_status,
    'trial_days',v_trial_days,
    'trial_started_at',v_trial_start,
    'trial_ends_at',v_trial_end
  );
end;
$function$;
