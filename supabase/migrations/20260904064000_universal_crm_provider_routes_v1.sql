-- Universal CRM provider routing v1.
-- Keeps CloudSales/Cloudy provider-agnostic while preserving existing adapters.

insert into public.integration_provider_routes (
  capability_key,
  provider_key,
  route_type,
  priority,
  enabled,
  minimum_support_status,
  quality_weight,
  cost_weight,
  latency_weight,
  metadata
)
select
  pc.capability_key,
  pc.provider_key,
  'direct',
  100,
  true,
  case when pc.support_status = 'implemented' then 'implemented' else 'beta' end,
  1.0,
  1.0,
  1.0,
  jsonb_build_object(
    'function_slug', case
      when pc.provider_key = 'highlevel' then 'automation-worker'
      when pc.provider_key in ('hubspot','pipedrive','zoho') then 'crm-universal-command'
      when pc.provider_key in ('salesforce','microsoft_dynamics','monday_crm') then 'crm-enterprise-command'
      when pc.provider_key in ('freshsales','close','copper') then 'crm-smb-command'
    end,
    'routing_version', 'crm_abstraction_v1'
  )
from public.provider_capabilities pc
where pc.provider_key in (
  'highlevel','hubspot','pipedrive','zoho',
  'salesforce','microsoft_dynamics','monday_crm',
  'freshsales','close','copper'
)
and pc.support_status in ('implemented','beta')
and pc.capability_key in (
  'crm.contact.upsert',
  'crm.opportunity.create',
  'crm.stage.update',
  'crm.appointment.create',
  'crm.lead.assign',
  'crm.pipeline.configure',
  'conversation.read',
  'conversation.send'
)
on conflict (capability_key, provider_key) do update set
  route_type = excluded.route_type,
  priority = excluded.priority,
  enabled = excluded.enabled,
  minimum_support_status = excluded.minimum_support_status,
  metadata = excluded.metadata,
  updated_at = now();
