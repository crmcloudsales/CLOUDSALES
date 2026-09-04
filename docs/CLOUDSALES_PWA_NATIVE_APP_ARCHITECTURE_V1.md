# CloudSales PWA Native-App Architecture v1

Status: ACTIVE / CANONICAL
Date: 2026-09-04

## Product principle

CloudSales must behave like an application, not like a long website trapped inside a fixed viewport.

The document/body must never become the navigation mechanism. Tapping a primary action changes the current app window/view.

### ZERO-SCROLL RULE — CANONICAL

CloudSales should not require vertical or horizontal scrolling anywhere in the normal app experience.

This applies to:
- primary pages;
- secondary pages;
- lists;
- cards;
- dashboards;
- chats;
- pipeline;
- inventory;
- files;
- settings;
- modals and sheets.

When information does not fit in one viewport, DO NOT make the user scroll. Split the information into focused windows and let the user move between those windows using tabs, next/previous controls, paging, contextual buttons, drill-down views or a dedicated detail window.

One viewport = one understandable decision surface.

Scrolling is not navigation in CloudSales.

CloudSales reduces software complexity. It does not reproduce HighLevel's entire navigation tree.

## CloudCo product philosophy inherited by CloudSales

Every CloudSales experience must follow the CloudCo operating philosophy:

1. Minimum friction.
2. Minimum complexity.
3. Clean, elegant and professional UI.
4. The user should see decisions, priorities and outcomes — not software complexity.
5. Cloudy and AgentCloud do the operational work; the user decides, approves, rejects, corrects or gives direction.
6. One screen should communicate one clear purpose.
7. Do not expose provider terminology, implementation details or technical keys when a human label exists.
8. Do not force users to hunt, scroll or study a dashboard to understand what matters.
9. If information is secondary, move it to another window rather than stacking it below.
10. Every design must work for an entrepreneur, a business and a company.

## User model

Every decision must work for three customer types:
1. Entrepreneur
2. Business
3. Company

The user should understand the app without learning CRM terminology first.

## Five canonical bottom actions

1. HOME — daily command center
2. INVENTORY — what the business can sell now
3. CLOUDY — central AI assistant/operator, official Cloudy head, voice-first
4. MARKETING — campaigns, content, spend, demand and performance
5. MORE — eight simplified operational modules

The middle Cloudy action is visually dominant but still clean. It breathes/pulses subtly and never uses a cloud glyph.

### Why Inventory remains primary

Inventory is the second business priority after daily execution: what the business has available to sell right now. CloudSales is service-commerce aware, so Inventory mirrors the products and services published on the user's website.

The default Inventory summary is intentionally minimal:
- Title
- Price
- Description

Inventory changes as the business sells, publishes, removes or replaces offers. CloudSales must support the cycle:
publish -> sell -> update -> sell again -> repeat.

AI Chat remains one tap away inside More.

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

If a window contains more records than fit on screen, paginate the records. Never extend the page downward.

No fabricated metrics. Empty states must explain what connection/data is needed.

## INVENTORY — service-commerce offer control

Inventory is the live sellable offer from the user's website.

Default item summary:
- Title
- Price
- Description

Do not clutter Inventory with provider metadata, technical statuses or unnecessary controls.

If more products or services exist than fit in one viewport, show the next set through paging controls. Do not scroll.

Cloudy should combine Inventory + Sales signals so it can identify:
- what is selling;
- what is not selling;
- what should be promoted;
- what should be replaced;
- what demand is emerging;
- what deserves less attention.

This creates the repeating CloudSales cycle: sell, learn, adjust, sell again.

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

Conversation history must not turn into a long scrolling transcript. Show the active exchange and use history/detail navigation for older content.

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

Each window must fit the viewport. Additional records use paging or drill-down windows, never scroll.

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

All eight modules inherit the zero-scroll rule. Records are paged or opened in dedicated windows.

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
- minimum operational font size: 12 px;
- no important information hidden below the viewport;
- no vertical or horizontal scroll in normal app use;
- use windows, tabs, paging and drill-down views instead of scroll;
- one dominant task per view;
- minimum friction and minimum complexity;
- mobile-first touch targets;
- consistent icons and labels;
- real data only.

When in doubt between stacking more information onto the current screen or creating another focused window, create the focused window.

## Technical migration rule

Do not solve this architecture by stacking new DOM-mutating patch runtimes indefinitely. Existing compatibility runtimes may be used during migration, but the target is a single canonical PWA source/shell. Every migrated feature should reduce, not increase, the number of competing navigation/layout layers.

The migration is complete only when each page has a native fixed-window implementation and no hidden legacy content depends on scroll for access.