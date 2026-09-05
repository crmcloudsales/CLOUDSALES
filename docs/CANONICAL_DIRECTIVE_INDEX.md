# Canonical Directive Enforcement Index

This file points every operator/agent to the mandatory source-of-truth locations.

1. `CANONICAL_USER_DIRECTIVE_POLICY.md` — human-readable canonical rule.
2. `config/canonical-directives.json` — machine-readable canonical rule.
3. `.github/workflows/cloudsales-canonical-user-directive-gate.yml` — CI enforcement.
4. Supabase `public.internal_settings.canonical_user_directive_policy` — runtime canonical policy record.
5. Supabase `public.internal_settings.canonical_billing_provider` — current payment-provider directive.
6. Google Drive document: `CLOUDSALES — CANONICAL USER DIRECTIVE POLICY — 2026-09-05`.
7. ChatGPT Library: `/CloudSales/Canonical Policies/CLOUDSALES_CANONICAL_USER_DIRECTIVE_POLICY_2026-09-05.md`.
8. GitHub Issue #34 — P0 tracking for PayPal-only checkout enforcement.

Current customer-facing billing directive: **PAYPAL ONLY**. BASIC US$47, PRO US$97, PREMIUM US$147. No Stripe customer checkout unless the user explicitly changes the directive.