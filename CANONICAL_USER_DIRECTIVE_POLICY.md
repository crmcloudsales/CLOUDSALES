# CLOUDSALES — CANONICAL USER DIRECTIVE POLICY

**Status:** P0 / CANONICAL / MANDATORY  
**Effective:** 2026-09-05  
**Owner:** Product owner / user explicit instruction

## Rule 0 — Explicit user instruction is the source of truth

When the user gives an explicit instruction about a provider, product, payment processor, price, workflow, design, account, customer, deployment target, or business rule, that exact instruction MUST be followed.

No model, agent, automation, developer, workflow, runtime, or assistant may silently substitute a different provider, platform, implementation, price, route, or business decision because it appears easier, more familiar, already integrated, or technically convenient.

Examples:
- If the user says **PayPal**, use **PayPal** for the scope they specified.
- If the user says **Stripe for markups**, Stripe remains allowed for markups only.
- If the user says **PRO US$97**, do not change the plan or price.
- If the user says **zero free trials**, no free-access period may be created, advertised or granted.
- If the user identifies a specific customer/account/email, do not create a different identity or workspace.

## Mandatory execution rules

1. **Read the latest explicit user instruction before every write or production change.**
2. **Latest explicit instruction wins** over older project assumptions when they conflict.
3. **No invention.** Missing IDs, URLs, credentials, prices, provider links, or facts must never be fabricated.
4. **No unauthorized substitutions.** A named provider/platform may not be replaced without the user's explicit approval.
5. **Respect scope.** A provider selected for one billing category must not be applied to another category unless explicitly instructed.
6. **No out-of-scope creation.** Do not create, activate, deploy, or modify unrelated resources merely because they already exist or are convenient.
7. **Verify before claiming success.** Never state that something is live, paid, delivered, deployed, authenticated, or working unless it has been checked with available evidence.
8. **Block on real dependencies, not assumptions.** If a requested action cannot be completed because a required external capability or credential is missing, state the exact blocker instead of creating a substitute.
9. **Preserve user intent across all agents/models.** Any delegated model or automation must inherit these rules.

## Current canonical payment directive

Until the user explicitly changes it:

### CloudSales subscription plans
- **BASIC — US$47/month → PayPal reusable payment link.**
- **PRO — US$97/month → PayPal reusable payment link.**
- **PREMIUM — US$147/month → PayPal reusable payment link.**
- Customer-facing subscription plan checkout is **PayPal only**.
- Do not use Stripe for BASIC, PRO, or PREMIUM plan checkout unless the user explicitly changes this directive.

### Markups
- **Stripe is allowed for all CloudSales markups.**
- Stripe may remain the processor for markup charges while the three subscription plans remain PayPal-only.

### Free-access policy
- **ZERO FREE TRIALS.**
- **Free days: 0.**
- **Charge from day one.**
- No website, PWA, checkout, email, promotion, marketplace flow, subscription record, provider configuration, entitlement or automation may advertise, create or grant a free trial period.
- Unpaid accounts remain billing-locked until payment is confirmed.
- This rule can only change through a later explicit user directive.

Do not label any checkout as PayPal unless the transaction is actually processed by PayPal. Do not label any checkout as Stripe unless it is actually processed by Stripe.

## Required customer journey

The intended CloudSales subscription journey must support, as applicable:

1. Select plan.
2. Pay from day one through the canonical payment provider for that billing category.
3. Create or access the CloudSales account.
4. Support email + password, Google, and Microsoft authentication when enabled.
5. Preserve the paid plan/account association.
6. Offer the appropriate web/app installation path for the user's operating system.
7. Never strand the user on a blank page, dead link, mismatched account or unpaid free-access state.

## Override rule

This policy can only be changed when the user explicitly changes the directive. A model or automation may not override it on its own.

This policy is subordinate only to non-overridable safety, legal, platform, and tool constraints.