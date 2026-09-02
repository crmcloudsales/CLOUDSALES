begin;

update public.subscription_plans
set features = jsonb_set(
  jsonb_set(coalesce(features,'{}'::jsonb),'{trial_days}','7'::jsonb,true),
  '{free_trial}','true'::jsonb,true
), updated_at=now()
where plan_key in ('basic','pro','premium');

commit;
