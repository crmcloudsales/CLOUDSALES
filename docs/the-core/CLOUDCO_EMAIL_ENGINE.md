# CLOUDCO EMAIL ENGINE

Status: ACTIVE v1
Owner: CloudCo / THE CORE
Bootstrap runtime: CloudSales Supabase project

## Canonical naming

This capability is permanently named **CLOUDCO EMAIL ENGINE**. CloudSales, LISTIA, UpSells, White Label and future CloudCo products consume the engine as products/brands; they do not own separate email engines.

All reusable CloudCo engines follow the convention:

`CLOUDCO {CAPABILITY} ENGINE`

Examples include CLOUDCO AI ENGINE, CLOUDCO CONTACT ENGINE, CLOUDCO LEAD ENGINE, CLOUDCO COMMUNICATIONS ENGINE, CLOUDCO CAMPAIGN ENGINE, CLOUDCO SECURITY ENGINE, CLOUDCO CRM ENGINE, CLOUDCO PIPELINE ENGINE, CLOUDCO BOOKING ENGINE, CLOUDCO BILLING ENGINE, CLOUDCO ANALYTICS ENGINE, CLOUDCO SUPPORT ENGINE and CLOUDCO NOTIFICATION ENGINE.

## Purpose

CLOUDCO EMAIL ENGINE provides a shared, multi-brand email layer with:

- sender identities by CloudCo product/brand;
- provider routing and free-first / lowest-cost selection;
- outbound queue and idempotency;
- suppression registry;
- explicit authorization policies;
- recurring operational notification authorization;
- templates and lifecycle categories;
- delivery/open/click/bounce/complaint event storage;
- webhook registry;
- provider capacity guards;
- audit logging;
- future failover across providers.

## Current provider order

1. Resend — active bootstrap provider, free-first limits enforced.
2. Brevo — planned fallback/free capacity.
3. Amazon SES — planned low-cost scale provider.

Provider choice must remain adapter-based. Product code must not become permanently coupled to one email vendor.

## Current canonical identities

- CloudSales: `info@cloudsales.app`
- LISTIA: `info@listiaapp.com`

UpSells and other CloudCo product identities are added to the same engine when their domains are ready.

## Authorization policy

Global policy remains `CLOUDCO_EMAIL_DEFAULT_DENY` for marketing/external outbound sends unless an allowed authorization path exists. Agents may not self-authorize external marketing sends.

Narrow recurring operational routes may be explicitly authorized. CloudSales real `lead_accepted` alerts are one such approved route. Fake leads must never be created merely to test email delivery.

## Operational lead alerts

A real CloudSales `lead_accepted` event queues one idempotent CLOUDCO EMAIL ENGINE job per authorized operational route. The engine sends the alert using the CloudSales identity and records the delivery/job relationship. Current explicitly authorized recipients include Luis Rangel and Gerardo Navarro.

## Runtime implementation

The logical engine is CLOUDCO EMAIL ENGINE. During the zero-cost bootstrap phase, the runtime is hosted inside the existing `cloudflare-control` Supabase Edge Function because the CloudSales project is at its Edge Function count limit. This preserves the free/lowest-cost requirement and avoids an unnecessary plan upgrade.

This internal runtime location is not the product name and must not leak into user-facing architecture. When THE CORE or UpSells receives its own infrastructure, the runtime may be split into a dedicated service without changing the engine contract.

## Core persistence

Primary tables:

- `email_engine_identities`
- `email_engine_providers`
- `email_engine_suppressions`
- `email_engine_templates`
- `email_engine_jobs`
- `email_engine_events`
- `email_engine_webhooks`
- `cloudco_engine_registry`

The canonical engine registry is the source for product-independent engine naming/status.

## Cost rule

Prefer free tiers first, then the cheapest reliable provider available. Enforce provider limits before dispatch. Scale should use provider failover rather than forcing a premature recurring infrastructure upgrade.

## Product boundary

CloudSales and LISTIA remain separate products with separate customer/business data. THE CORE provides reusable engine behavior. Sharing an engine does not authorize cross-product sharing of customer data.
