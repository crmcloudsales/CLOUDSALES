# CloudSales — HighLevel Marketplace release package

Status: READY FOR DEVELOPER PORTAL VERSION UPDATE
Date: 2026-08-31
Previous approved app identity: Real Estate
New public app identity: CloudSales

## Public listing

**App name**
CloudSales

**Short description**
AI-native sales and marketing operations for your CRM.

**Marketplace description**
CloudSales turns your CRM into an AI-operated commercial workspace. Connect your account and let Cloudy help your team work with contacts, opportunities, pipelines, appointments and conversations from one mobile-first operating environment.

CloudSales is designed for businesses that want faster lead response, cleaner commercial execution and less manual CRM work. It combines AI-assisted sales operations, lead-quality controls, follow-up, appointment workflows, conversation tools, commercial visibility and automation in a PWA that works across mobile and desktop.

Key capabilities include:
- Contacts and lead operations
- Opportunities, pipelines and stage management
- Appointments and calendar operations
- CRM conversations and messages
- AI-assisted sales workflows with Cloudy
- Lead-quality and junk-lead controls
- Commercial activity and operational visibility
- Secure multi-workspace architecture
- Mobile-first CloudSales PWA

CloudSales is an independent product. References to HighLevel describe the connected CRM platform and do not imply endorsement, certification, partnership or ownership by HighLevel.

## URLs

Homepage: https://cloudsales.app/
App / OAuth destination: https://app.cloudsales.app/
OAuth redirect URL: https://app.cloudsales.app/?oauth=highlevel
Privacy Policy: https://cloudsales.app/privacy
Terms of Service: https://cloudsales.app/terms
Support: use the CloudSales support channel exposed at cloudsales.app / inside the CloudSales account until a dedicated public support URL is published.

## Branding assets already in repository

Marketplace icon candidate:
- web/assets/cloudsales-app-icon-official-v2.png

Additional approved CloudSales assets:
- web/assets/cloudsales-app-icon-official-v2-192.png
- web/assets/cloudsales-isotipo-official-512.png
- web/assets/cloudsales-logo-official-v2.png

Do not use HighLevel/GHL logos in the CloudSales app artwork unless HighLevel provides explicit authorization.

## Distribution

Preserve the existing approved app's immutable Target User setting. Do not attempt to recreate the app solely to change Target User unless HighLevel review requires it.

Desired distribution when compatible with the already-approved app configuration:
- Target user: Sub-account
- Who can install: Both Agency and Sub-account
- Bulk install: Yes

Reason: CloudSales ultimately operates each business/location workspace, while agency owners/admins should also be able to distribute CloudSales to their sub-accounts.

## OAuth scopes — release request

Request only the scopes required by implemented CloudSales capabilities:

- contacts.readonly
- contacts.write
- opportunities.readonly
- opportunities.write
- calendars.readonly
- calendars/events.readonly
- calendars/events.write
- conversations.readonly
- conversations.write
- conversations/message.readonly
- conversations/message.write
- locations.readonly
- users.readonly
- workflows.readonly
- oauth.write

Do NOT add broad unrelated scopes simply to request "everything". HighLevel review requires least privilege. If a future CloudSales module needs another scope, create a new draft version and add it with a specific product justification.

## Scope justifications

contacts.readonly / contacts.write
CloudSales reads, creates and updates CRM contacts and links them to the CloudSales lead/contact workspace.

opportunities.readonly / opportunities.write
CloudSales reads and operates opportunities, assignments, stages and pipeline workflows.

calendars.readonly / calendars/events.readonly / calendars/events.write
CloudSales needs available calendar context and creates/updates appointment activity.

conversations.readonly / conversations.write / conversations/message.readonly / conversations/message.write
CloudSales exposes CRM conversation context and supports authorized message/conversation actions.

locations.readonly
Used to identify and validate the installed HighLevel business/location and display the correct workspace identity.

users.readonly
Used for assignee/user context for commercial operations.

workflows.readonly
Used to understand available HighLevel workflows for CloudSales automation/orchestration without modifying workflow definitions.

oauth.write
Required for supported Marketplace installation/lifecycle operations such as application uninstall management.

## Webhook configuration

Webhook endpoint:
https://fkahaqprzgcimgyathqx.supabase.co/functions/v1/highlevel-private-connect

The endpoint validates HighLevel webhook signatures and supports installation lifecycle.

Required lifecycle webhooks:
- AppInstall / INSTALL
- AppUninstall / UNINSTALL
- AppUpdate / UPDATE when available for this app version

CRM webhook events should be enabled only when the corresponding scope is approved and CloudSales has a production consumer for that event. The current Marketplace endpoint persists signed non-lifecycle events for controlled processing; request-on-demand CRM control remains available through highlevel-command.

## Marketplace-first OAuth flow

1. User finds CloudSales in the HighLevel Marketplace.
2. User clicks Install / Add App and approves CloudSales scopes.
3. HighLevel redirects to https://app.cloudsales.app/?oauth=highlevel with the authorization code.
4. CloudSales immediately exchanges the short-lived code server-side.
5. Access and refresh tokens are stored in Supabase Vault; secrets are never returned to the browser.
6. A one-time claim token is returned to the PWA. Only its SHA-256 hash is persisted server-side.
7. Existing CloudSales user: installation is attached to the selected/current workspace.
8. New CloudSales user: installation survives sign-up; after authentication CloudSales creates or selects a workspace and attaches the HighLevel installation.
9. CloudSales stores the normal connection record and uses the OAuth refresh token for ongoing access.
10. On HighLevel uninstall, CloudSales marks the connection revoked and replaces stored token material with revoked values.

## Backend implementation

Supabase project: fkahaqprzgcimgyathqx
Lifecycle table: public.highlevel_marketplace_installations
Lifecycle/OAuth Edge Function: highlevel-private-connect v4+
Command/control Edge Function: highlevel-command
Provider credentials: public.provider_app_credentials provider_key=highlevel
Secrets: Supabase Vault via secret IDs only

## Repository implementation

- supabase/functions/highlevel-private-connect/index.ts
- supabase/functions/highlevel-command/index.ts
- web/install.js

## Current canonical CloudSales plans

STARTER — US$47/month
PRO — US$97/month
PREMIUM — US$147/month, includes 2 users; additional seat US$47/month

Marketplace pricing/billing configuration must match the final billing model selected in the Developer Portal. Do not mark the HighLevel app as Paid + External Billing until CloudSales has connected the HighLevel billing authorization callback to the Stripe subscription lifecycle.

## Review notes

- Standard/non-whitelabel app identity: CloudSales.
- Do not use the old public name "Real Estate" in the new listing except migration/history notes not visible to customers.
- HighLevel is a connected CRM/distribution platform, not the CloudSales product identity.
- OAuth credentials and tokens must never appear in listing copy, browser code, screenshots or logs.
- Installation and uninstall behavior must be tested with a real HighLevel test location before submitting the new version for review.
