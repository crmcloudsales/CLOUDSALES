# CLOUDSALES — CANONICAL USER DIRECTIVE POLICY

**Status:** P0 / CANONICAL / MANDATORY  
**Effective:** 2026-09-05  
**Owner:** Product owner / user explicit instruction

## Rule 0 — Explicit user instruction is the source of truth

When the user gives an explicit instruction about a provider, product, payment processor, price, workflow, design, account, customer, deployment target, or business rule, that exact instruction MUST be followed.

No model, agent, automation, developer, workflow, runtime, or assistant may silently substitute a different provider, platform, implementation, price, route, or business decision because it appears easier, more familiar, already integrated, or technically convenient.

Examples:
- If the user says **PayPal**, use **PayPal**. Do not substitute Stripe.
- If the user says **PRO US$97**, do not change the plan or price.
- If the user identifies a specific customer/account/email, do not create a different identity or workspace.

## Mandatory execution rules

1. **Read the latest explicit user instruction before every write or production change.**
2. **Latest explicit instruction wins** over older project assumptions when they conflict.
3. **No invention.** Missing IDs, URLs, credentials, prices, provider links, or facts must never be fabricated.
4. **No unauthorized substitutions.** A named provider/platform may not be replaced without the user's explicit approval.
5. **No out-of-scope creation.** Do not create, activate, deploy, or modify unrelated resources merely because they already exist or are convenient.
6. **Verify before claiming success.** Never state that something is live, paid, delivered, deployed, authenticated, or working unless it has been checked with available evidence.
7. **Block on real dependencies, not assumptions.** If a requested action cannot be completed because a required external capability or credential is missing, state the exact blocker instead of creating a substitute.
8. **Preserve user intent across all agents/models.** Any delegated model or automation must inherit these rules.

## Current canonical payment directive

Until the user explicitly changes it:

- **Customer-facing CloudSales subscription payments: PayPal only.**
- BASIC: **US$47**
- PRO: **US$97**
- PREMIUM: **US$147**
- Do not use Stripe links for customer-facing CloudSales plan checkout.
- Do not label any checkout as PayPal unless the transaction is actually processed by PayPal.

## Required customer journey

The intended CloudSales subscription journey must support, as applicable:

1. Select plan.
2. Pay through the canonical payment provider chosen by the user.
3. Create or access the CloudSales account.
4. Support email + password, Google, and Microsoft authentication when enabled.
5. Preserve the paid plan/account association.
6. Offer the appropriate web/app installation path for the user's operating system.
7. Never strand the user on a blank page, dead link, or mismatched account.

## Override rule

This policy can only be changed when the user explicitly changes the directive. A model or automation may not override it on its own.

This policy is subordinate only to non-overridable safety, legal, platform, and tool constraints.