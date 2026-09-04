# CloudSales PWA Native-App Architecture v1

Status: ACTIVE / CANONICAL
Date: 2026-09-04

## Product principle

CloudSales behaves like an application, never like a long website trapped inside a viewport.

The user should not learn software. Cloudy and AgentCloud do the operational work; the user sees priorities, chooses, approves, corrects and moves forward.

### ZERO-SCROLL RULE — CANONICAL

CloudSales does not require vertical or horizontal scrolling in normal app use.

This applies to primary pages, secondary pages, lists, cards, dashboards, chats, pipeline, inventory, files, contact profiles, settings, modals and sheets.

When information does not fit, split it into focused windows and use tabs, paging, next/previous controls, contextual actions or a dedicated detail window.

One viewport = one understandable decision surface.

Scrolling is not navigation in CloudSales.

## CloudCo decision hierarchy

Every PWA decision, menu position and information hierarchy must support these priorities in order:

1. GENERATE REVENUE.
2. WORK LESS.
3. FEEL LESS STRESS.
4. SEE THE VALUE OF THE INVESTMENT CLEARLY.

The product journey must repeat this formula every day:

SEE WHAT MATTERS -> ACT ON REVENUE -> LET CLOUDY WORK -> GENERATE DEMAND -> REVIEW ONLY WHAT NEEDS ATTENTION -> REPEAT.

The experience must work for an entrepreneur, a business and a company.

## Five canonical bottom actions

The five permanent actions are:

1. HOME — what matters today; money, priorities, appointments, approvals and next best action.
2. AI CHAT — conversations that can become revenue now.
3. CLOUDY — the brain; central AI assistant/operator, voice-first, official Cloudy head.
4. MARKETING — the heart; generate demand, control growth and understand what is working.
5. MORE — lower-frequency operating surfaces.

Cloudy remains visually centered and subtly heartbeat/pulse animated. Cloudy is never represented by a cloud glyph.

Inventory is no longer a permanent bottom-navigation button. It remains essential, but moves to MORE because AI Chat is used more frequently in the revenue journey.

## HOME — daily command center

Home answers: “What deserves my attention now?”

Using real workspace data only, Cloudy surfaces:
- what changed while the user was away;
- the highest-value priorities today;
- leads/opportunities that deserve attention;
- appointments and follow-up risk;
- open pipeline value;
- decisions/approvals waiting for the user;
- what is selling and what is not;
- what Cloudy recommends doing next.

Home windows:
- TODAY
- SALES
- AGENDA
- APPROVALS

Records paginate. The page never extends downward.

## AI CHAT — revenue conversations

AI Chat is a primary bottom-navigation surface.

Its job is not to expose an inbox implementation. It answers:
- who needs a response now;
- which conversation has buying intent;
- what Cloudy/AgentCloud already answered;
- what requires human judgment;
- what next action can move the conversation toward an appointment or sale.

Conversation history is paged or opened in a dedicated window. No endless transcript scrolling.

## CLOUDY — the brain

Cloudy is the personal AI business assistant/operator.

Primary states:
- Ready
- Listening
- Understanding
- Thinking
- Speaking

Interaction:
- tap Cloudy once to start;
- silence ends the user turn;
- Cloudy responds automatically;
- wake word “Cloudy” where supported;
- text is fallback, not the dominant experience.

Cloudy does the work and brings the user decisions, exceptions and recommendations.

## MARKETING — the heart

Marketing is a permanent primary surface because demand generation is central to revenue.

CloudSales replaces the complexity of coordinating agencies, freelancers and marketing teams with a decision layer operated by Cloudy.

### When marketing has not started

Cloudy gathers only the information a competent marketing team actually needs:
1. What are we selling?
2. Who do we want to reach?
3. What result counts as success?
4. What is the budget/guardrail?
5. Where do we want to sell?
6. What assets/accounts/data already exist?
7. What may Cloudy do automatically and what requires approval?

Then Cloudy prepares the plan and next actions. Spend-sensitive actions follow approval rules.

### When marketing is already running

The user should be able to answer immediately:
- Is it working?
- What changed?
- Which campaign/channel is producing qualified demand?
- Where are we wasting money?
- Are we on budget?
- What should we stop, correct, maintain or scale?
- What real sales feedback can improve ad optimization?
- What needs my approval now?
- What does Cloudy recommend next?

Marketing windows:
- TODAY — outcome pulse and Cloudy recommendation.
- START — guided campaign brief.
- CAMPAIGNS — active/paused/attention-required campaigns.
- FEEDBACK — CRM outcomes returned as provider-safe conversion/quality signals.

Do not expose raw private notes or documents to advertising providers. Internal data may help Cloudy reason, but external feedback uses normalized, permitted commercial signals such as qualified lead, appointment, opportunity, won/lost outcome and revenue when supported and consent/policy allow it.

## MORE — eight lower-frequency modules

Display in a 4 x 2 grid in this exact priority order:

1. LEADS — who can become revenue; qualification, source and contact record.
2. PIPELINE — opportunities and next sales action.
3. INVENTORY — what can be sold now.
4. CALENDAR — appointments and availability.
5. FILES — business/contact documents and media.
6. TEAM — what is happening with each member and what needs attention.
7. CONNECT — providers, CRM and integration health.
8. BILLING — subscription, usage, invoices, value and account essentials.

BILLING remains bottom-right.

AUTOMATIONS are deliberately not a primary user module. Cloudy should operate automation complexity and surface only exceptions, approvals and outcomes in the relevant business window.

## LEADS

Lead screens answer: “Who deserves attention and what should happen next?”

A contact can contain:
- documents;
- notes;
- tasks;
- opportunities;
- appointments;
- quality and lifecycle information;
- source and attribution context.

Opening a contact uses fixed tabs/windows, never a long drawer.

## PIPELINE

Pipeline answers: “What do you want to do with this opportunity?”

Every opportunity should expose a small set of business actions such as:
- prepare/follow up;
- open the contact context;
- change stage when needed;
- mark outcome;
- ask Cloudy for next best action.

Provider implementation details remain hidden.

## INVENTORY

Inventory is a live mirror of the sellable products/services/offers published by the business.

Default summary for every item:
- Title
- Price
- Description

There is no three-item inventory limit. ALL relevant published items remain accessible. The number shown per viewport is only a presentation page size; paging indicates the visible range and total count.

CloudSales is service-commerce first, not an ecommerce storefront. Inventory supports the repeating cycle:

SELL -> LEARN -> UPDATE -> SELL AGAIN.

Cloudy combines Inventory + Sales + Marketing signals to identify what is moving, what is not, what deserves promotion and what should receive less attention.

## FILES + CONTACT DATA

When uploading a contact document from Files, the user first selects the contact.

The selector searches/filter in real time using available:
- name;
- email;
- company/business;
- phone.

Opening a contact also allows adding documents, notes and tasks directly to that contact.

Private contact context stays inside CloudSales unless a specific authorized integration requires it. Advertising feedback is normalized into provider-safe outcome/conversion signals rather than uploading raw documents or note text.

## TEAM

Team answers: “What is happening with each person and what needs attention?”

Show only operationally useful information such as:
- member identity;
- role/status;
- recent workspace activity;
- blocked/pending work where available;
- decisions/ownership that require attention.

Do not turn Team into intrusive surveillance.

## BILLING

Billing must prevent the feeling of an opaque expensive subscription by making value and cost structure understandable.

Show clearly:
- plan/subscription;
- usage/work performed;
- billing period / next cut;
- advertising spend separately from CloudSales charges;
- work executed by Cloudy/AgentCloud when available;
- invoices/payment/account controls.

Never fabricate ROI or attribution. Show value using real recorded work and real business outcomes only.

## HighLevel simplification map

CloudSales does not clone HighLevel navigation.

- Contacts -> LEADS
- Opportunities/pipelines -> PIPELINE
- Conversations -> AI CHAT
- Calendars -> CALENDAR
- Workflows/triggers -> CLOUDY-managed automation, surfaced contextually
- Products/services/sites/funnels -> INVENTORY
- Social/campaigns/ad reporting -> MARKETING
- Media/documents -> FILES
- Users/roles -> TEAM
- Integrations -> CONNECT
- Payments/subscriptions/account -> BILLING

Provider-specific modules are surfaced contextually instead of becoming new menu items.

## UI rules

Inherit UCDS-1:
- clean, elegant and professional;
- no overloaded dashboards;
- no decorative feature walls;
- minimum operational font size: 12 px;
- no technical keys when a human label exists;
- no content flash behind the canonical CloudSales logo;
- no important information hidden below the viewport;
- no vertical or horizontal scroll in normal app use;
- use windows, tabs, paging and drill-down views;
- one dominant purpose per view;
- consistent touch targets and branding;
- real data only.

When in doubt between adding information to the current window or creating a focused next window, create the focused next window.

## Technical migration rule

Compatibility runtimes may be used only during migration. The target is one canonical PWA source/shell. Every migration step must reduce competing navigation/layout logic.

The migration is complete only when every page has a fixed-window native implementation and no hidden legacy content depends on scroll for access.