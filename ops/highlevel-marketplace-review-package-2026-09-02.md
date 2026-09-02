# CloudSales — HighLevel Marketplace Review Package

Updated: 2026-09-02

## Product under review

CloudSales is a paid, public, white-label Marketplace app with Target User = Sub-Account and installers = Both Agency & Sub-account. CloudSales is the customer-facing product. Cloudy is the primary operator that executes authorized CRM, lead-management, sales, marketing, content, scheduling and automation work. AgentCloud is limited to AI conversations and calls.

Production URLs:
- Billing: https://cloudsales.app/subscribe
- Redirect: https://cloudsales.app/oauth/callback
- Welcome: https://cloudsales.app/welcome
- PWA: https://app.cloudsales.app
- Getting Started: https://cloudsales.app/getting-started.html
- Terms: https://cloudsales.app/terms
- Privacy: https://cloudsales.app/privacy
- Usage Pricing: https://cloudsales.app/usage-pricing

## Why broad operational access is required

CloudSales is not a single-purpose contact sync. Its core product promise is that a member can delegate day-to-day sales and marketing work to Cloudy. That requires Cloudy to read the current business state and perform the corresponding authorized actions in the connected Sub-Account. The requested scopes are therefore broad but tied to concrete product functions. Agency-only administration is intentionally separated from this app and reserved for the separate CloudSales Agency connector.

## Requested scope groups and review justification

### Advertising and lead acquisition
`adPublishing.readOnly`, `adPublishing.write`

Cloudy reads campaign/ad performance, integrations, forms, pixels, audiences and reporting, then creates, publishes, pauses, resumes, duplicates or updates advertising assets when authorized. This supports qualified-lead generation and campaign optimization.

### Businesses
`businesses.readonly`, `businesses.write`

Cloudy reads and maintains business records associated with contacts and customer accounts.

### Calendars, resources and appointments
`calendars.readonly`, `calendars.write`, `calendars/groups.readonly`, `calendars/groups.write`, `calendars/resources.readonly`, `calendars/resources.write`, `calendars/events.readonly`, `calendars/events.write`

Cloudy checks availability, creates and manages calendars/resources, books appointments, updates appointments, manages blocked slots and supports automated scheduling.

### Campaign membership and execution
`campaigns.readonly`, `campaigns.write`

Cloudy determines campaign state and manages campaign participation/actions used by automated follow-up. If the current portal does not expose `campaigns.write` for the app version, omit it and rely on the supported contact/workflow actions.

### Contacts, tasks, notes and tags
`contacts.readonly`, `contacts.write`

Cloudy searches, creates, updates and deduplicates contacts; manages contact tasks, notes and tags; and enrolls/removes contacts from supported campaigns/workflows. This is central to lead qualification and follow-up.

### Custom Objects
`objects/schema.readonly`, `objects/schema.write`, `objects/record.readonly`, `objects/record.write`

CloudSales supports businesses with non-standard CRM entities. Cloudy needs to understand custom schemas and create/update records so customers are not forced into a fixed data model.

### Conversations and messages
`conversations.readonly`, `conversations.write`, `conversations/message.readonly`, `conversations/message.write`

Cloudy monitors communication context and conversation state. AgentCloud uses these capabilities for AI conversations/calls. The app reads message recordings/transcriptions where available and sends/updates authorized messages.

### Forms
`forms.readonly`, `forms.write`

Cloudy reads lead-capture forms/submissions and handles supported form file operations needed for lead intake and qualification workflows.

### Invoices, estimates and recurring schedules
`invoices.readonly`, `invoices.write`, `invoices/schedule.readonly`, `invoices/schedule.write`, `invoices/template.readonly`, `invoices/template.write`, `invoices/estimate.readonly`, `invoices/estimate.write`

Cloudy can prepare, send and maintain invoices/estimates/templates and recurring invoice schedules when a customer delegates billing/collections work. Financial actions are subject to CloudSales authorization and audit controls.

### Trigger links
`links.readonly`, `links.write`

Cloudy uses trigger links to build and maintain measurable follow-up and conversion automations.

### Location configuration used by the Sub-Account
`locations.readonly`, `locations/customValues.readonly`, `locations/customValues.write`, `locations/customFields.readonly`, `locations/customFields.write`, `locations/tags.readonly`, `locations/tags.write`, `locations/templates.readonly`, `locations/tasks.readonly`

Cloudy reads Sub-Account identity/configuration and manages operational custom values, fields and tags required for automation and CRM mapping. `locations.write` is excluded because it is Agency-level administration.

### Media and funnel assets
`medias.readonly`, `medias.write`, `funnels/redirect.readonly`, `funnels/redirect.write`, `funnels/page.readonly`, `funnels/funnel.readonly`, `funnels/pagecount.readonly`

Cloudy needs access to media and funnel metadata/assets for landing pages, campaign content, redirects and conversion optimization.

### Opportunities and pipelines
`opportunities.readonly`, `opportunities.write`

Cloudy creates and updates opportunities, stages, status and value as leads progress through the sales process.

### Payments and commerce operations
`payments/integration.readonly`, `payments/integration.write`, `payments/orders.readonly`, `payments/orders.write`, `payments/transactions.readonly`, `payments/subscriptions.readonly`, `payments/coupons.readonly`, `payments/coupons.write`, `payments/custom-provider.readonly`, `payments/custom-provider.write`

Cloudy reads transaction/subscription state, assists with order fulfillment and coupon operations, and supports authorized payment-provider integrations. Payment actions remain auditable and subject to customer authorization.

### Products, prices and collections
`products.readonly`, `products.write`, `products/prices.readonly`, `products/prices.write`, `products/collection.readonly`, `products/collection.write`

Cloudy manages the products/services a business sells, including prices, collections and related catalog updates used by websites, campaigns and sales workflows.

### Social Planner
`socialplanner/account.readonly`, `socialplanner/account.write`, `socialplanner/csv.readonly`, `socialplanner/csv.write`, `socialplanner/category.readonly`, `socialplanner/oauth.readonly`, `socialplanner/oauth.write`, `socialplanner/post.readonly`, `socialplanner/post.write`, `socialplanner/tag.readonly`, `socialplanner/statistics.readonly`

Cloudy connects authorized social accounts, prepares/schedules/updates posts, manages bulk CSV workflows and reads statistics to optimize content performance.

### Surveys
`surveys.readonly`

Cloudy reads survey definitions/submissions for lead qualification, feedback and customer-service automation.

### Users
`users.readonly`, `users.write`

Cloudy needs to resolve owners/assignees and, where a business explicitly delegates it, maintain user configuration relevant to routing and workflows. Every action is audited by CloudSales Member identity.

### Workflows
`workflows.readonly`, `workflows.write`

Cloudy reads and manages workflows to implement customer-requested automation. If `workflows.write` is not exposed for the current public-app portal version, omit it and use supported workflow enrollment/actions while retaining `workflows.readonly`.

### Courses and blogs/content
`courses.write`, `blogs/post.write`, `blogs/post-update.write`, `blogs/check-slug.readonly`, `blogs/category.readonly`, `blogs/author.readonly`

Cloudy can publish/update authorized educational and blog content as part of customer content/SEO work. These permissions are tied to CloudSales content automation features.

### Associations and relationships
`associations.readonly`, `associations.write`, `associations/relation.readonly`, `associations/relation.write`

Cloudy preserves relationships among CRM records and custom objects during synchronization and automation.

### Email Builder and schedules
`emails/builder.readonly`, `emails/builder.write`, `emails/schedule.readonly`

Cloudy reads/builds email assets and understands scheduled email activity used in marketing and follow-up automation.

### Documents, proposals and contracts
`documents_contracts/list.readonly`, `documents_contracts/sendlink.write`, `documents_contracts_templates/list.readonly`, `documents_contracts_templates/sendlink.write`

Cloudy can find approved documents/templates and send proposal/contract links when requested by an authorized member.

### Marketplace installation and metered billing
`marketplace-installer-details.readonly`, `charges.readonly`, `charges.write`

CloudSales needs installation context for lifecycle/support and uses Marketplace billing charges for authorized usage-based billing. Subscription pricing and usage policy are disclosed at the CloudSales pricing/usage URLs.

### Voice AI and phone resources
`voice-ai-dashboard.readonly`, `voice-ai-agents.readonly`, `voice-ai-agents.write`, `voice-ai-agent-goals.readonly`, `voice-ai-agent-goals.write`, `phonenumbers.read`, `numberpools.read`

AgentCloud handles AI conversations and calls. These scopes allow the app to configure/read voice agents and goals, inspect call outcomes and select authorized phone resources. Cloudy orchestrates the surrounding business workflow.

## Intentionally excluded from the main Sub-Account app

`locations.write`, `oauth.readonly`, `oauth.write`, `snapshots.readonly`, `snapshots.write`, `companies.readonly`, `custom-menu-link.readonly`, `custom-menu-link.write`

These are primarily Agency-level administration capabilities. They belong in the separate CloudSales Agency connector, preventing the main customer-facing Sub-Account app from requesting Agency-only authority.

## Reviewer demo — Loom 1: end-to-end functionality

1. Install CloudSales into a HighLevel App Test/Sandbox Sub-Account.
2. Show the OAuth consent screen and exact redirect to `https://cloudsales.app/oauth/callback`.
3. Complete the 7-day-trial subscription checkout with payment method required.
4. Show the CloudSales welcome page and PWA access.
5. Verify the HighLevel connection is present inside CloudSales.
6. Create/update a test contact through Cloudy and show the change in the CRM.
7. Create/update a test opportunity.
8. Schedule or update a test appointment.
9. Demonstrate one authorized conversation/message action.
10. Demonstrate one workflow/marketing action and one lead-quality workflow.
11. Show webhook-driven synchronization back into CloudSales.
12. Show uninstall/disconnect behavior and token revocation.

## Reviewer demo — Loom 2: scope justification

Walk through the scope groups above. For each group, show the corresponding CloudSales/Cloudy feature and one representative read or write operation. Explicitly point out that Agency-only scopes are excluded from this app and are separated into the CloudSales Agency connector.

## Security points to state in review

- Client secrets, access tokens and refresh tokens are never exposed in browser code.
- Provider secrets and OAuth tokens are stored server-side using Vault references.
- Production endpoints use HTTPS.
- OAuth callback is exact and controlled by CloudSales.
- HighLevel webhook signatures are verified server-side.
- CloudSales keeps an audit log of automated and user-triggered actions.
- Organization-owned CRM/channel data is separated from portable CloudSales Member identity.
- Financial and other higher-risk actions can require authorization/approval according to CloudSales policy.

## Current external blockers before final Submit for Review

1. HighLevel Developer Portal must persist the selected scopes, redirect URL and Client Key for the draft.
2. A real App Test/Sandbox installation must be completed after those portal fields persist.
3. The two required review Looms must be recorded from the working test installation.
4. CloudSales transactional access-email delivery is currently degraded because the stored Resend credential returns HTTP 401; checkout, HighLevel billing authorization and PWA access remain independent of this email fallback.
