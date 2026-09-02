create index if not exists idx_integration_provider_routes_provider_key on public.integration_provider_routes(provider_key);
create index if not exists idx_highlevel_marketplace_installations_connection_id on public.highlevel_marketplace_installations(connection_id);
create index if not exists idx_landing_events_gate_id on public.landing_events(gate_id);
create index if not exists idx_lead_distribution_pool_gate_id on public.lead_distribution_pool(gate_id);
create index if not exists idx_lead_distribution_pool_organization_id on public.lead_distribution_pool(organization_id);
create index if not exists idx_operational_email_deliveries_automation_job_id on public.operational_email_deliveries(automation_job_id);
create index if not exists idx_operational_email_deliveries_organization_id on public.operational_email_deliveries(organization_id);
create index if not exists idx_operational_email_deliveries_route_id on public.operational_email_deliveries(route_id);
create index if not exists idx_operational_email_routes_organization_id on public.operational_email_routes(organization_id);
create index if not exists idx_user_entitlements_organization_id on public.user_entitlements(organization_id);
create index if not exists idx_user_entitlements_subscription_id on public.user_entitlements(subscription_id);

drop policy if exists user_entitlements_select_self on public.user_entitlements;
create policy user_entitlements_select_self on public.user_entitlements
for select to authenticated
using ((user_id = (select auth.uid())) or private.is_org_member(organization_id));

drop policy if exists user_entitlements_update_self on public.user_entitlements;
create policy user_entitlements_update_self on public.user_entitlements
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
