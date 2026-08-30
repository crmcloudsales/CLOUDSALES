-- This SECURITY DEFINER routine is a trigger implementation, not a public RPC.
-- Keep trigger behavior intact while removing direct API execution from client roles.
revoke all on function public.queue_cloudsales_lead_operational_notifications() from public;
revoke all on function public.queue_cloudsales_lead_operational_notifications() from anon;
revoke all on function public.queue_cloudsales_lead_operational_notifications() from authenticated;
grant execute on function public.queue_cloudsales_lead_operational_notifications() to service_role;
