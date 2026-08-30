# CLOUDCO — THE CORE — ENGINES FROZEN v2 FINAL

Frozen: 2026-08-30

## Core philosophy

**CLOUDCO — LA IA TRABAJANDO POR TI.**

CloudCo exists to reduce friction, complexity and physical/manual work. The user should operate a service business from one simplified AI-first experience. Internal complexity belongs behind THE CORE, not in the user's workflow.

## Absolute project-isolation doctrine

LISTIA, CloudSales and UpSells are always independent products with their own repositories, Supabase projects/databases, Cloudflare projects/workers/pages, secrets, domains, deployments, telemetry, billing configuration and product data.

A product may copy/adopt a reusable capability or versioned THE CORE module, but it must **never depend at runtime on another sibling product**. LISTIA never depends on CloudSales. CloudSales never depends on LISTIA. UpSells never depends on either.

All products use the same CloudCo THE CORE contracts and reusable implementation patterns. Prefer the same versioned Core module deployed independently inside each product. Shared source; isolated runtime and data.

HighLevel is temporary/replaceable infrastructure behind LISTIA and CloudSales. It is an adapter, not the brain. The long-term goal is for UpSells/THE CORE to replace the role HighLevel currently performs, with less friction and more autonomous AI execution.

## No-ecommerce doctrine

CloudCo is focused on businesses that sell **services, reservations, appointments, experiences, access, professional work and service-based outcomes**. CloudCo does not intend to become a general ecommerce/order-fulfillment platform competing with Amazon, Mercado Libre or similar marketplaces.

Therefore **CLOUDCO ORDER ENGINE is permanently removed from the frozen Core**. Restaurants/hospitality may integrate external POS/order providers through Integration Engine if needed; CloudCo focuses on customer acquisition, reservations, service delivery, payment, retention and growth.

## Offers are campaign attributes, not an Engine

Promotions, discounts, urgency, incentives and campaign offers live inside **CLOUDCO CAMPAIGN ENGINE**, with Billing/Payment support where needed. **CLOUDCO OFFER ENGINE is permanently removed**.

## AI works; humans are not given more chores

There is no customer-facing **PROJECT & TASK ENGINE**. Projects, tasks, deadlines, next actions and orchestration are internal capabilities of **CLOUDCO WORKFLOW ENGINE + CLOUDCO AGENT ENGINE**. The default outcome is execution by AI, not creating more task lists for users.

DevOps/release automation is also not a customer-facing Core Engine. Coding agents use Agent + Workflow + Integration + Observability + Security internally.

## Capabilities explicitly retained

**Contracts/Documents stay.** Service businesses need proposals, agreements, contracts, signatures, versions and document lifecycle.

**Expenses/Procurement stay.** Businesses need spend control, vendors, purchasing, approvals and expense visibility.

## FINAL FROZEN REGISTRY — 40 ENGINES

1. **CLOUDCO IDENTITY & ORGANIZATION ENGINE** — users, auth, companies, workspaces, roles, permissions and entitlements.
2. **CLOUDCO BUSINESS DNA ENGINE** — structured understanding of the business, brand, market, services, goals and operational context.
3. **CLOUDCO INTEGRATION ENGINE** — OAuth, API keys, secrets, provider adapters, mappings, scopes and connection health.
4. **CLOUDCO EVENT ENGINE** — canonical events, webhooks, idempotency and internal event routing.
5. **CLOUDCO WORKFLOW ENGINE** — automation, triggers, schedules, retries, approvals, execution plans and internal work orchestration.
6. **CLOUDCO SECURITY ENGINE** — WAF, anti-bot, rate limiting, abuse prevention, threat controls and hardening.
7. **CLOUDCO COMPLIANCE ENGINE** — privacy, terms, consent, authorizations, suppressions, retention and audit rules.
8. **CLOUDCO QUALITY ENGINE** — lead quality, data quality, validation, scoring, AI quality and confidence controls.
9. **CLOUDCO COST & APPROVAL ENGINE** — provider cost, usage, budgets, markup, limits, approval gates and financial-risk controls.
10. **CLOUDCO AI ENGINE** — model/provider routing, fallback, quality, latency, multimodality and cost optimization.
11. **CLOUDCO AGENT ENGINE** — autonomous AI workers, tools, goals, permissions, coordination and action execution.
12. **CLOUDCO KNOWLEDGE ENGINE** — business memory, RAG, files, websites, knowledge sources and reusable context.
13. **CLOUDCO VOICE ENGINE** — STT, TTS, voice profiles, calls and voice assistants.
14. **CLOUDCO CONTACT ENGINE** — Customer 360, identity resolution, identifiers, dedupe, history, preferences and source links.
15. **CLOUDCO LEAD ENGINE** — capture, validation, scoring, qualification, lifecycle, routing and ownership.
16. **CLOUDCO CRM ENGINE** — canonical CRM and replaceable CRM adapters such as HighLevel, HubSpot, Salesforce and Zoho.
17. **CLOUDCO PIPELINE ENGINE** — opportunities, lifecycle stages, transitions, probabilities, next-best-action and conversion state.
18. **CLOUDCO MATCHING ENGINE** — demand-to-supply, lead-to-service, lead-to-professional, ranking, rotation and assignment.
19. **CLOUDCO COMMUNICATIONS ENGINE** — omnichannel conversations, webchat, WhatsApp, SMS, social messaging and future channels.
20. **CLOUDCO EMAIL ENGINE** — transactional, operational, lifecycle and marketing email; provider routing, deliverability, suppression, templates and tracking.
21. **CLOUDCO NOTIFICATION ENGINE** — push, in-app alerts, operational notifications, badges, priorities and preferences.
22. **CLOUDCO CAMPAIGN ENGINE** — paid/organic/outbound campaigns, audiences, budgets, offers/promotions, scheduling and lifecycle.
23. **CLOUDCO CONTENT ENGINE** — AI content generation/adaptation, brand assets, approvals, social publishing and distribution.
24. **CLOUDCO SITE ENGINE** — websites, landing pages, microsites, forms, embeds, managed sites and conversion UX.
25. **CLOUDCO ATTRIBUTION ENGINE** — UTMs, sources, touchpoints, CAPI/CRM events, conversion signals and ad feedback loops.
26. **CLOUDCO ANALYTICS ENGINE** — KPIs, funnels, cohorts, CAC, CPL, CPA, LTV, activation, retention, forecasting and reporting.
27. **CLOUDCO CATALOG ENGINE** — service/catalog abstraction: properties, rooms, tours, vehicle inventory, professional services, menus/service offerings and packages.
28. **CLOUDCO INVENTORY ENGINE** — availability, capacity, units, slots, active inventory state and synchronization.
29. **CLOUDCO DISCOVERY ENGINE** — search, filters, maps, semantic discovery, recommendations and saved searches.
30. **CLOUDCO BOOKING ENGINE** — appointments, reservations, availability, calendars, confirmation, rescheduling, cancellation and no-shows.
31. **CLOUDCO PAYMENT ENGINE** — checkout, payment methods, payments, refunds and payment-provider adapters.
32. **CLOUDCO BILLING ENGINE** — SaaS plans, subscriptions, seats, usage, invoices, proration, renewals and past-due lifecycle.
33. **CLOUDCO PARTNER ENGINE** — affiliates, referrals, brokers/partners, commissions, attribution and payouts.
34. **CLOUDCO SUPPORT & SELF-HEALING ENGINE** — AI customer service, cases, diagnostics, escalation, resolution and self-healing workflows.
35. **CLOUDCO OBSERVABILITY ENGINE** — logs, errors, uptime, health, latency, monitoring, diagnostics and operational alerts.
36. **CLOUDCO FINANCE & ACCOUNTING ENGINE** — cash flow, AR/AP, budgets, accounting views, financial reporting and accounting-system adapters.
37. **CLOUDCO EXPENSE & PROCUREMENT ENGINE** — expenses, vendors, purchasing, purchase approvals, receipts and spend controls.
38. **CLOUDCO PEOPLE & HR ENGINE** — employees, recruiting, schedules, roles, performance context and payroll/HR adapters.
39. **CLOUDCO DOCUMENT & CONTRACT ENGINE** — proposals, contracts, signatures, versions, approvals, document lifecycle and provider adapters.
40. **CLOUDCO OPERATIONS & ASSET ENGINE** — operational assets, equipment, locations, maintenance, service operations and operational state.

## Engines explicitly removed

- CLOUDCO ORDER ENGINE — removed; ecommerce/order fulfillment is out of scope.
- CLOUDCO OFFER ENGINE — removed; offers/promotions are Campaign Engine capabilities.
- CLOUDCO PROJECT & TASK ENGINE — removed; internal orchestration belongs to Workflow + Agent. Do not create manual work for users by default.
- CLOUDCO DEVOPS & RELEASE ENGINE — removed as a customer Engine; internal coding/release autonomy uses Agent + Workflow + Integration + Observability + Security.

## Revenue-first priority

LISTIA launch and CloudSales monetization come first. UpSells is built in parallel by extracting/copying reusable Core capabilities without coupling products.

### R0 — subscription/revenue now
1. CLOUDCO EMAIL ENGINE
2. CLOUDCO CONTACT ENGINE
3. CLOUDCO LEAD ENGINE
4. CLOUDCO MATCHING ENGINE
5. CLOUDCO SITE ENGINE
6. CLOUDCO COMMUNICATIONS ENGINE
7. CLOUDCO BOOKING ENGINE
8. CLOUDCO PIPELINE ENGINE
9. CLOUDCO PAYMENT ENGINE
10. CLOUDCO BILLING ENGINE
11. CLOUDCO NOTIFICATION ENGINE
12. CLOUDCO ATTRIBUTION ENGINE
13. CLOUDCO ANALYTICS ENGINE
14. CLOUDCO CAMPAIGN ENGINE

### R1 — AI does the work
AI → Agent → Workflow → CRM → Integration → Security → Quality → Compliance → Cost & Approval → Knowledge → Voice → Support & Self-Healing.

### R2 — complete service-business operating system
Business DNA → Catalog → Inventory → Discovery → Content → Partner → Finance & Accounting → Expense & Procurement → People & HR → Document & Contract → Operations & Asset → Identity/Organization/Event/Observability hardening.

## Definition of DONE

An Engine is not DONE because a table or function exists. DONE means: stable canonical contract; independent deployability per product; multi-tenant schema where relevant; no sibling-product runtime dependency; provider adapter boundary; security/RLS; idempotency where applicable; observability; cost controls; tests; documentation; production use in LISTIA or CloudSales; and portable deployment into UpSells.
