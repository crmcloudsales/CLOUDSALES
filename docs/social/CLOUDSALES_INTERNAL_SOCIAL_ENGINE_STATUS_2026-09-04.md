# CloudSales Internal Social Engine — 2026-09-04

Scope: CloudSales brand only. Subscriber/user social connections are intentionally not enabled by this checkpoint.

## Canonical seven-channel topology

- Instagram -> Zernio
- Facebook -> Zernio
- LinkedIn -> Buffer
- TikTok -> Buffer
- Threads -> Buffer
- YouTube -> native YouTube Data API v3
- Google Business Profile -> native Google Business Profile APIs

## Live Supabase state

The seven CloudSales channel identities and provider bindings are registered in production with tenant-isolated, organization-owned records. External/provider identifiers remain pending until verified. YouTube and Google Business Profile are cataloged with planned native capabilities rather than falsely marked implemented.

Buffer provider-side channels LinkedIn, TikTok and Threads are owner-confirmed connected, but the backend Buffer API credential is not stored yet. Zernio provider-side Instagram and Facebook are owner-confirmed connected, but the backend Zernio API credential is not stored yet. Google OAuth application credentials and user consent tokens for YouTube / Business Profile are not stored yet.

## Repository implementation prepared

- `_shared/social-contract.ts`: provider-agnostic social contract and risk classes.
- `integration-catalog/buffer.ts`: current Buffer GraphQL API key auth, organization/channel discovery, image/video/document/link publishing and scheduling.
- `integration-catalog/zernio.ts`: tenant-aware Zernio account verification plus publish/schedule runtime.
- `integration-catalog/google-native.ts`: Business Profile posts/reviews/replies plus native YouTube resumable upload runtime.
- `integration-catalog/index.ts`: CloudSales-brand-only status, Buffer sync and publishing routes.
- `admin-secrets-setup/index.ts`: secure Vault form prepared for Buffer API key, Zernio API key and Google Social OAuth client credentials. Secrets are never returned after storage.
- `connection-start-v4/index.ts`: Google OAuth start support prepared for YouTube and Google Business Profile in addition to Google Ads.

## Deployment state

The database topology/migrations are live. The new Edge Function source changes are committed but are not live yet.

A deployment workflow was tested. It correctly stopped before deployment because the repository does not currently contain `SUPABASE_ACCESS_TOKEN`. The workflow was then changed to manual-only to avoid repeated failing production CI runs.

Do not call the new publishing runtime live until the affected Edge Functions have been deployed and provider credentials/account consent have been completed.

## Remaining external gates

1. Store CloudSales Buffer API key securely; sync verified Buffer channel IDs.
2. Store CloudSales Zernio API key securely; verify Instagram and Facebook account IDs against the Zernio profile.
3. Store/reuse a Google OAuth Web client securely for YouTube and Google Business Profile.
4. Complete CloudSales account consent for YouTube and Business Profile and persist refresh/access tokens.
5. Run controlled E2E tests before public autonomous posting.

For YouTube, image-only cross-posting requires the CloudSales Content Engine to transform the image into a video/Short first. The YouTube adapter intentionally requires video media.
