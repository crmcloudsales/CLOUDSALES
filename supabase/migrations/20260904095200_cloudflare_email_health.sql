-- CloudSales Email Engine: include Cloudflare Email Sending in the existing daily provider health cycle.
-- Cloudflare uses an Account API Token; its health check is handled by cloudflare-token-setup
-- via a command-queue gated JSON request. No Cloudflare secret is stored in cron.job.

create or replace function public.run_cloudco_email_provider_healthcheck()
returns bigint
language plpgsql
security definer
set search_path to 'public','extensions','net'
as $function$
declare
  v_token text;
  v_request_id bigint;
  v_cf_command uuid;
  v_cf_request bigint;
begin
  select public.email_engine_read_secret('cloudco_email_engine_token') into v_token;
  if v_token is null or length(v_token)<20 then
    raise exception 'cloudco_email_engine_token_missing';
  end if;

  select net.http_post(
    url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/cloudflare-control',
    body := jsonb_build_object('action','health'),
    params := '{}'::jsonb,
    headers := jsonb_build_object('content-type','application/json','x-cloudco-email-token',v_token),
    timeout_milliseconds := 15000
  ) into v_request_id;

  insert into public.internal_command_queue(command_type,input,expires_at)
  values ('cloudflare_email_health','{}'::jsonb,now()+interval '10 minutes')
  returning id into v_cf_command;

  select net.http_post(
    url := 'https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/cloudflare-token-setup',
    body := jsonb_build_object('command_id',v_cf_command),
    params := '{}'::jsonb,
    headers := jsonb_build_object('content-type','application/json'),
    timeout_milliseconds := 15000
  ) into v_cf_request;

  return v_request_id;
end;
$function$;

revoke all on function public.run_cloudco_email_provider_healthcheck() from public, anon, authenticated;
grant execute on function public.run_cloudco_email_provider_healthcheck() to service_role;
