# CloudSales — Revenue & Client Access Readiness Audit

Date: 2026-08-31
Priority: make existing connected clients productive in CloudSales PWA and convert usage into recurring revenue.

## Executive status

CloudSales is technically closer to sellable than the raw feature backlog suggests. The HighLevel adapter and PWA follow-up runtimes are live. The dominant blockers are client workspace activation, automatic pipeline materialization, existing-client billing attachment, and operational notifications.

## PENNYWORTH live state

- Organization: active.
- HighLevel connection: connected and live.
- Meta connection: connected.
- HighLevel live snapshot audit: provider contacts reachable; 4 contacts observed; 0 opportunities and 0 appointments at audit time.
- CloudSales local materialization: 3 HighLevel contacts present; 0 opportunities and 0 appointments at audit time; form/conversation normalization exists.
- HighLevel pipeline mapping `CloudSales | Sales` is active with stages New Lead, Contacted, Qualified, Appointment, Visited / Presented, Offer / Negotiation, Reservation / Deposit, Won, Lost / Nurture.
- HighLevel sales calendar mapping is active.
- Intended client operator claim invitations exist and are email-bound, but remain unconsumed. Therefore intended operators are not yet active CloudSales organization members.
- Current billing record is trialing/manual Pro with billing pending; it is not yet an attached recurring Stripe subscription for the organization.

## PWA capabilities already live

The current private PWA release loads authentication, mobile operations, Cloudy, Works, ad-spend, AI Chat, AI Chat channels, Calendar, Calendar bridge, and contact-profile runtimes.

For a user who has an active organization membership and connected HighLevel account, the current backend supports:

- HighLevel contact and opportunity snapshot sync.
- HighLevel pipeline discovery.
- Contact notes read/write.
- Contact upsert.
- Opportunity create, assignment and stage update.
- Conversation search/read/message history.
- Outbound SMS, Email, WhatsApp, Instagram, Facebook, Custom, Live Chat and Internal Comment through the connected HighLevel account.
- Calendar appointment creation and HighLevel synchronization when the mapped sales calendar is present.
- Contact files/documents and CloudSales contact profile.

## Critical gap found and fixed during this audit

Previously an accepted gated lead created/upserted a contact and CRM contact-sync job, but did not automatically create an opportunity. That produced the exact failure mode visible in PENNYWORTH: contacts exist while the sales pipeline is empty.

Migration `accepted_lead_auto_opportunity_v1` is now applied and versioned. For future accepted leads:

1. Create one CloudSales opportunity in `New Lead`, idempotent per accepted lead attempt.
2. Preserve property/interest/quality context in opportunity metadata.
3. If the gate has an active HighLevel connection and `cloudsales_sales` pipeline mapping, automatically queue `crm.opportunity.create` to the mapped HighLevel `New Lead` stage.
4. Challenge/rejected leads are not materialized into the sales pipeline.

## Pricing / monetization state

Canonical CloudSales plans are already aligned in database and billable catalog:

- STARTER — USD 47/month — usage markup 50%.
- PRO — USD 97/month — usage markup 25%.
- PREMIUM — USD 147/month — 2 included users — USD 47/month extra seat — usage markup 12.5%.

Stripe product/price mappings exist for all three plans and the Premium extra seat.

Checkout + claim architecture can attach a completed checkout to an existing organization, but the public checkout does not automatically bind itself to an existing workspace before payment. Existing clients therefore need a deliberate in-app billing path so payment upgrades the already-connected organization rather than encouraging creation of a second workspace.

## Notification state

PENNYWORTH operational lead notification routes exist, but recent notification jobs were suppressed with `operational_route_not_authorized`. The CloudSales sender identity `info@cloudsales.app` is still pending in the Email Engine while Resend itself is active. This is a P0 follow-up issue because sales follow-up depends on prompt lead alerts until push notifications are complete.

## Security state relevant to launch

- HighLevel command API requires an authenticated user, active organization membership, an allowed role, organization-bound connection, origin allowlist and rate limiting.
- HighLevel secrets remain in Vault-backed storage.
- Organization claim links are one-time, expire, are stored as hashes and can be bound to an expected email.
- PWA is private/noindex.
- Supabase security advisor currently warns that Auth leaked-password protection is disabled. This should be enabled before wider self-serve rollout.
- Multiple internal service tables intentionally use RLS with no client policies so only privileged service paths can reach them.

## Revenue-first completion order

### P0-A — Existing-client access

1. Refresh and deliver email-bound CloudSales claim invitations for the intended PENNYWORTH operators.
2. Verify signup/signin -> claim -> PENNYWORTH workspace selection on mobile.
3. Verify role behavior (operator can work leads; billing/admin stays owner/admin only).
4. Repeat for other already-connected HighLevel client organizations.

### P0-B — Follow-up from CloudSales PWA

1. Accepted lead -> contact -> automatic New Lead opportunity (fixed in this audit).
2. Leads page -> contact profile -> note -> pipeline stage change.
3. Inbox/AI Chat -> existing HighLevel conversation -> send/reply.
4. Calendar -> create appointment -> HighLevel sales calendar.
5. Mobile-first live E2E using a controlled QA lead, without messaging a real prospect.

### P0-C — Turn connected clients into recurring revenue

1. Add in-app `Activate plan` checkout bound to the current organization.
2. On payment, claim checkout into that exact organization; never create a duplicate workspace for an existing connected client.
3. Enforce subscription/seat entitlements while preserving data and connection state.
4. Show billing status, card/update-payment route and invoices in PWA.
5. Convert manual/trialing pilot accounts to Stripe only with customer-authorized checkout.

### P0-D — Lead alerts

1. Fix CloudSales Email Engine sender/operational authorization.
2. Deliver immediate accepted-lead email alerts to configured organization recipients.
3. Add PWA push/in-app notification as the durable channel; email remains fallback.

### P1 — Revenue expansion after the core loop works

- Works usage billing and ledger UX.
- Cloudy/AgentCloud actions that directly reduce sales follow-up time.
- Ads controls and feedback loops.
- More CRM connectors after the HighLevel client path is proven repeatably.
- Domains, Academy, UpSells and cross-sells should remain revenue channels, but must not delay the P0 CloudSales client loop.

## Launch definition

CloudSales is sellable for an existing HighLevel client when a real client can, from a phone:

PAY / ACTIVATE -> SIGN IN -> OPEN EXISTING WORKSPACE -> SEE NEW LEAD -> OPEN CONTACT -> READ/REPLY -> MOVE PIPELINE -> BOOK APPOINTMENT -> RECEIVE ALERT -> SEE BILLING/WORKS.

No HighLevel dashboard should be required for the normal daily follow-up loop.
