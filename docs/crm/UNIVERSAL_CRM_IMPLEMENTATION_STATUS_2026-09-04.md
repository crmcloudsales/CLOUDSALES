# CloudSales Universal CRM — implementation status

Date: 2026-09-04

## Product contract

- CloudSales is the product and evolves as a Business Management Platform (BMP).
- Cloudy is the AI Operator and targets CloudSales canonical capabilities.
- AgentCloud is limited to AI conversations and calls.
- CRM providers are replaceable infrastructure behind CloudSales.
- LISTIA must emit/consume CloudSales canonical events and must not permanently target a HighLevel-specific endpoint.

## Verified existing production building blocks

Supabase already contains the core abstractions required to avoid rebuilding the platform:

- `connections`
- `connection_secrets`
- `connection_authorizations`
- `connection_health_checks`
- `connection_mappings`
- `provider_catalog`
- `provider_app_credentials`
- `provider_capabilities`
- `integration_provider_routes`
- `external_object_links`
- `contacts`
- `opportunities`
- `appointments`
- `organization_members`
- `automation_jobs`
- `audit_log`
- Cloudy sessions/messages/agents/tool-run infrastructure

Existing runtime adapters are preserved:

- HighLevel: `automation-worker` / `highlevel-command`
- HubSpot, Pipedrive, Zoho: `crm-universal-command`
- Salesforce, Microsoft Dynamics 365, monday CRM: `crm-enterprise-command`
- Freshsales, Close, Copper: `crm-smb-command`

No production adapter above was replaced.

## Changes implemented in this increment

### 1. Canonical provider contract

Added:

`supabase/functions/_shared/crm-contract.ts`

This defines normalized CRM action names, execution context, execution result, capability support and the formal `CRMProviderAdapter` boundary. Cloudy should target this contract rather than provider SDK method names.

### 2. Provider route registry activated

`integration_provider_routes` is now populated for currently implemented/beta CRM capabilities. Routes map a normalized capability to the existing production adapter function.

Examples:

- HighLevel `crm.contact.upsert` -> `automation-worker`
- HubSpot `crm.contact.upsert` -> `crm-universal-command`
- Salesforce `crm.opportunity.create` -> `crm-enterprise-command`
- Freshsales `crm.stage.update` -> `crm-smb-command`

The route rows are versioned by:

`supabase/migrations/20260904064000_universal_crm_provider_routes_v1.sql`

### 3. Cloudy automation dispatch made provider-agnostic

Updated database trigger function:

`private.dispatch_automation_job()`

It now:

1. uses the actual `connection_id` to resolve the authoritative provider when available;
2. checks `provider_capabilities` before dispatching a CRM operation;
3. resolves the adapter through `integration_provider_routes`;
4. preserves explicit routes for mapping, Meta Ads, Google Ads and CloudSales-core jobs;
5. keeps backwards-compatible fallbacks for existing CRM adapters;
6. refuses to invent support for unregistered/planned capabilities.

Versioned by:

`supabase/migrations/20260904064500_provider_agnostic_automation_dispatch_v1.sql`

This is the critical runtime change that makes Cloudy's queued CRM execution provider-agnostic without rewriting the existing adapters.

### 4. Authenticated manual dispatcher upgraded

`automation-dispatch-user` was updated in production to resolve the connected CRM provider, verify capability support, resolve its registered route, and invoke the correct worker adapter.

The source is now stored at:

`supabase/functions/automation-dispatch-user/index.ts`

## Current capability coverage verified from provider_capabilities

### Implemented HighLevel capabilities

- conversation.read
- conversation.send
- crm.appointment.create
- crm.contact.upsert
- crm.lead.assign
- crm.opportunity.create
- crm.pipeline.configure
- crm.stage.update

### Beta routed capabilities

For HubSpot, Pipedrive, Zoho, Salesforce, Dynamics, monday CRM, Freshsales, Close and Copper, the current provider runtimes cover the canonical core subset already present in `provider_capabilities`, principally:

- crm.contact.upsert
- crm.opportunity.create
- crm.stage.update

Beta means the adapter exists but must not be marketed as production-complete until provider-specific contract/E2E tests pass.

## Providers intentionally not promoted to implemented

Twenty, Odoo, SAP and Oracle remain future adapters. No capability was fabricated or silently marked implemented.

Twenty remains a strategic open-source/internal-infrastructure candidate, not a claim that it is commercially a top-10 CRM.

## Known constraints

Supabase is currently at the project Edge Function count limit. A new direct `crm-command` endpoint was committed as an architectural proof but could not be deployed as a new function slot. The live provider-agnostic execution path was therefore implemented safely through the existing automation dispatch/trigger architecture instead of deleting a working function.

Do not claim the repo-only `crm-command` endpoint is live until a runtime slot is available or an existing safe slot is intentionally repurposed.

## Next implementation gates

1. Build common CRM contract tests against the routed adapters.
2. Make direct UI/provider calls converge on the same route registry, not only Cloudy automation jobs.
3. Add Twenty adapter behind the same contract.
4. Convert LISTIA fan-out into an explicit canonical event contract.
5. Add webhook normalization/idempotency contract tests.
6. Add marketplace documentation/package scaffolds from current official provider documentation.
7. Complete Basic/Pro/Premium entitlement mode implementation and Member limits.
8. Do not declare any marketplace submission complete until the provider confirms it.
