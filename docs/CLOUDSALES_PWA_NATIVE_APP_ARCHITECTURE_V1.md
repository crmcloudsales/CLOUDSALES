# CloudSales PWA Native-App Architecture v1

Status: ACTIVE / CANONICAL
Date: 2026-09-04

## Product principle

CloudSales must behave like an application, not like a long website trapped inside a fixed viewport.

The document/body must not become the navigation mechanism. Tapping a primary action changes the current app window/view. Long information is split into focused internal windows, lists or sheets. Internal lists may scroll when needed; the app document itself must not require vertical page scrolling for primary navigation.

CloudSales reduces software complexity. It does not reproduce HighLevel's entire navigation tree.

## User model

Every decision must work for three customer types:
1. Entrepreneur
2. Business
3. Company

The user should understand the app without learning CRM terminology first.

## Five canonical bottom actions

1. HOME — daily command center
2. INVENTORY — what the business can sell and what is available
3. CLOUDY — central AI assistant/operator, official Cloudy head, voice-first
4. MARKETING — campaigns, content, spend, demand and performance
5. MORE — eight simplified operational modules

The middle Cloudy action is visually dominant but still clean. It breathes/pulses subtly and never uses a cloud glyph.

### Why Inventory remains primary

Inventory is the second business priority after daily execution: what the business has, what is available, what is selling and what is not. CloudSales is service-commerce aware, so Inventory includes products, services and the public website/catalog representation of the offer.

AI Chat remains one tap away inside More. Usage telemetry may justify promoting AI Chat later without changing the data architecture.

## HOME — what matters today

Home is not a generic dashboard. It is the place the user opens every day.

Cloudy should answer, using real workspace data only:
- Welcome/back context.
- What Cloudy completed while the user was away.
- What changed since the last visit.
- Today's highest-priority actions.
- Approvals/authorizations waiting for the owner.
- Leads and opportunities that deserve attention.
- Appointments and follow-up risk.
- Open pipeline value / money sitting in opportunities.
- What is selling and what is not.
- Demand/opportunity signals.
- What Cloudy believes the user should stop wasting time on.
- What Cloudy recommends doing next.

The user should mainly decide, approve, reject, annotate, attach a document or ask Cloudy. Cloudy and AgentCloud do the operational work.

Home internal windows:
- TODAY
- SALES
- AGENDA
- APPROVALS

No fabricated metrics. Empty states must explain what connection/data is needed.

## INVENTORY — service-commerce offer control

Inventory combines the business offer in one place:
- Products
- Services
- Availability/status
- Price/current offer metadata where relevant
- Website/catalog visibility
- Sales velocity / what is moving
- What is not moving
- Low/zero availability or stale offer warnings
- Add/update item

This is not the Marketing screen. Marketing creates demand; Inventory defines what can be sold.

Internal windows:
- ALL
- PRODUCTS
- SERVICES
- WEBSITE

## CLOUDY — one-action AI operator

Cloudy must be conversational and voice-first, not a giant chat page.

Primary states:
- Ready
- Listening
- Understanding
- Thinking
- Speaking

Interaction:
- tap Cloudy once to start;
- silence ends the user's turn;
- Cloudy responds and speaks automatically;
- session can continue hands-free;
- wake word “Cloudy” when supported;
- text is a fallback, not the dominant interaction.

Cloudy uses the official character/head and must never be shown as a cloud icon or generic robot.

## MARKETING — demand and growth control

Marketing is a primary surface because CloudSales is intended to replace the complexity of coordinating agencies, freelancers and fragmented marketing tools.

Show the decision layer, not provider complexity:
- campaigns running / paused / needing approval;
- spend and budget status;
- leads and qualified leads;
- cost per qualified lead where data exists;
- channel performance;
- social/content publishing status;
- recommended next action;
- approval of spend-sensitive changes.

Internal windows:
- OVERVIEW
- CAMPAIGNS
- CONTENT
- SPEND

## MORE — HighLevel complexity collapsed into eight modules

HighLevel exposes hundreds of routes and many product areas. CloudSales deliberately collapses the operational surface into eight understandable modules.

Display these in a 4 × 2 sheet/grid in this exact priority order, with BILLING / ACCOUNT in the bottom-right position:

1. AI CHAT — omnichannel conversations/inbox and AI-assisted communication
2. LEADS — contacts, qualification, source, notes and customer record
3. PIPELINE — opportunities, stages, value and follow-up
4. CALENDAR — appointments, availability and scheduling
5. AUTOMATIONS — workflows, triggers, recurring/automatic work and execution status
6. FILES — documents, media and workspace files
7. CONNECT — CRM/provider/integration connections, essential settings and system health
8. BILLING — subscription, usage, invoices/payment/account/security essentials

The user should not need to know which underlying provider implements a capability.

## HighLevel simplification map

HighLevel capabilities are normalized as follows:
- Contacts + contact activity + forms/surveys results -> LEADS
- Opportunities + pipelines -> PIPELINE
- Conversations + messaging/calls/social inbox -> AI CHAT
- Calendars + appointments -> CALENDAR
- Workflows + triggers + automation logs -> AUTOMATIONS
- Products + websites/funnels + service-commerce offer data -> INVENTORY
- Social Planner + campaigns + ad/reporting layer -> MARKETING
- Media/documents -> FILES
- Integrations + account/provider settings -> CONNECT
- Payments/subscriptions/invoices/account essentials -> BILLING

Reputation, memberships, forms, surveys, funnels and other provider-specific modules are surfaced contextually inside the closest CloudSales module rather than becoming new primary navigation items.

## UI rules

Inherit UCDS-1:
- clean, elegant and professional;
- no overloaded dashboards;
- no decorative feature walls;
- no tiny text;
- no important information hidden below an unscrollable viewport;
- use internal windows instead of document scroll;
- one dominant task per view;
- minimum friction and minimum complexity;
- mobile-first touch targets;
- consistent icons and labels;
- real data only.

## Technical migration rule

Do not solve this architecture by stacking new DOM-mutating patch runtimes indefinitely. Existing compatibility runtimes may be used during migration, but the target is a single canonical PWA source/shell. Every migrated feature should reduce, not increase, the number of competing navigation/layout layers.