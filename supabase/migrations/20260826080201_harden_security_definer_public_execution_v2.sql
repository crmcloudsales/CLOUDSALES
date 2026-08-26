-- CloudSales production hardening
-- Restrict privileged SECURITY DEFINER RPCs to service_role only.

revoke all on function public.attach_signal_mappings_to_connected_provider() from public, anon, authenticated;
revoke all on function public.emit_canonical_appointment_event() from public, anon, authenticated;
revoke all on function public.emit_canonical_opportunity_events() from public, anon, authenticated;
revoke all on function public.has_provider_authorization(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.has_required_cloudsales_legal_acceptance(uuid, uuid) from public, anon, authenticated;
revoke all on function public.queue_signal_deliveries_from_commercial_event() from public, anon, authenticated;
revoke all on function public.seed_cloudsales_onboarding_for_org() from public, anon, authenticated;
revoke all on function public.seed_cloudsales_signal_mappings_for_org() from public, anon, authenticated;

grant execute on function public.attach_signal_mappings_to_connected_provider() to service_role;
grant execute on function public.emit_canonical_appointment_event() to service_role;
grant execute on function public.emit_canonical_opportunity_events() to service_role;
grant execute on function public.has_provider_authorization(uuid, uuid, text) to service_role;
grant execute on function public.has_required_cloudsales_legal_acceptance(uuid, uuid) to service_role;
grant execute on function public.queue_signal_deliveries_from_commercial_event() to service_role;
grant execute on function public.seed_cloudsales_onboarding_for_org() to service_role;
grant execute on function public.seed_cloudsales_signal_mappings_for_org() to service_role;
