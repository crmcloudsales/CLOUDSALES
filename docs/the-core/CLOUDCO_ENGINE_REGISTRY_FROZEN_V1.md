# CLOUDCO — THE CORE — ENGINES FROZEN v1

Frozen: 2026-08-30

## Canonical rule

THE CORE is CloudCo-owned reusable infrastructure. CloudSales, LISTIA, UpSells and White Label consume these Engines. Providers are replaceable adapters. A new provider, model, CRM, payment gateway, product or industry does **not** create a new Engine. Adding Engine #38 requires an explicit architecture decision.

## Status legend

- **ACTIVE**: reusable Core contract and working flow exist.
- **BUILDING**: substantial functionality exists in CloudSales/LISTIA but still needs extraction, hardening or portability work.
- **PLANNED**: defined and needed but not yet sufficiently reusable.

## Frozen registry — 37 Engines

1. **CLOUDCO IDENTITY & ORGANIZATION ENGINE** — BUILDING
2. **CLOUDCO BUSINESS DNA ENGINE** — BUILDING
3. **CLOUDCO INTEGRATION ENGINE** — BUILDING
4. **CLOUDCO EVENT ENGINE** — BUILDING
5. **CLOUDCO WORKFLOW ENGINE** — BUILDING
6. **CLOUDCO SECURITY ENGINE** — BUILDING
7. **CLOUDCO COMPLIANCE ENGINE** — BUILDING
8. **CLOUDCO QUALITY ENGINE** — BUILDING
9. **CLOUDCO COST & APPROVAL ENGINE** — BUILDING
10. **CLOUDCO AI ENGINE** — BUILDING
11. **CLOUDCO AGENT ENGINE** — BUILDING
12. **CLOUDCO KNOWLEDGE ENGINE** — BUILDING
13. **CLOUDCO VOICE ENGINE** — BUILDING
14. **CLOUDCO CONTACT ENGINE** — BUILDING
15. **CLOUDCO LEAD ENGINE** — BUILDING
16. **CLOUDCO CRM ENGINE** — BUILDING
17. **CLOUDCO PIPELINE ENGINE** — BUILDING
18. **CLOUDCO MATCHING ENGINE** — BUILDING
19. **CLOUDCO COMMUNICATIONS ENGINE** — BUILDING
20. **CLOUDCO EMAIL ENGINE** — ACTIVE v1
21. **CLOUDCO NOTIFICATION ENGINE** — BUILDING
22. **CLOUDCO CAMPAIGN ENGINE** — BUILDING
23. **CLOUDCO CONTENT ENGINE** — BUILDING
24. **CLOUDCO SITE ENGINE** — BUILDING
25. **CLOUDCO ATTRIBUTION ENGINE** — BUILDING
26. **CLOUDCO ANALYTICS ENGINE** — BUILDING
27. **CLOUDCO CATALOG ENGINE** — BUILDING
28. **CLOUDCO INVENTORY ENGINE** — BUILDING
29. **CLOUDCO DISCOVERY ENGINE** — BUILDING
30. **CLOUDCO BOOKING ENGINE** — BUILDING
31. **CLOUDCO ORDER ENGINE** — PLANNED
32. **CLOUDCO PAYMENT ENGINE** — BUILDING
33. **CLOUDCO BILLING ENGINE** — BUILDING
34. **CLOUDCO OFFER ENGINE** — PLANNED
35. **CLOUDCO PARTNER ENGINE** — BUILDING
36. **CLOUDCO SUPPORT & SELF-HEALING ENGINE** — BUILDING
37. **CLOUDCO OBSERVABILITY ENGINE** — BUILDING

## Product-specific capabilities are not new Engines

- LISTIA Marketplace / Global Property Index = Catalog + Inventory + Discovery + Matching + Site + Attribution specialization.
- Pennyworth / Junk Lead Firewall = Security + Lead + Quality + Attribution specialization.
- Cloudy / AgentCloud = Agent + AI + Workflow + Knowledge + Integration + Voice experience.
- UpSells restaurant/hotel/auto/tours/real-estate packages = vertical configuration over the same Engines.

## Revenue-first build order

### R0 — immediate subscription/revenue impact
Email → Contact → Lead → Matching → Site → Pipeline → Payment → Billing → Notification → Attribution → Analytics → Campaign.

### R1 — close and operate with less manual work
Communications → AI → Agent → CRM → Workflow → Integration → Security → Quality → Compliance → Cost & Approval.

### R2 — UpSells horizontal expansion
Business DNA → Catalog → Inventory → Discovery → Booking → Order → Offer → Partner → Content → Knowledge → Voice → Support & Self-Healing → Identity/Organization hardening → Event hardening → Observability hardening.

## Definition of DONE

An Engine is not DONE merely because a table or function exists. DONE requires: stable canonical contract; multi-tenant schema; provider adapter boundary; security/RLS; idempotency where applicable; observability; cost controls; tests; documentation; at least one production integration in CloudSales or LISTIA; and portability demonstrated for UpSells without irreversible provider coupling.
