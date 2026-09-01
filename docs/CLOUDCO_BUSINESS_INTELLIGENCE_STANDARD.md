# CloudCo Business Intelligence Standard

Purpose: make CloudSales, LISTIA, UpSells and future CloudCo products understand a business before generating websites, campaigns, content, automations or recommendations.

## Required workflow

1. Identify the business and vertical.
2. Research first-party sources first: website, public social profiles, menus/catalogs, official listings and public contact data.
3. Research third-party sources: Google/public listings, reputable directories, review platforms and local/editorial coverage.
4. Separate every field into `verified`, `conflicting`, `inferred` or `unknown`.
5. Extract repeated customer signals from reviews rather than cherry-picking isolated comments.
6. Build a structured business profile containing identity, location, services/products, audience, pricing evidence, reputation signals, differentiators, recurring complaints, brand language and operational facts.
7. Produce a brand recommendation only after the profile exists: positioning, promise, tone, visual direction, palette, typography direction, imagery direction and claims to avoid.
8. Never invent products, prices, hours, ratings, testimonials, awards or locations.
9. When sources conflict, prefer current first-party/current reliable listings and visibly preserve the uncertainty.
10. Persist the profile with the customer/workspace so CloudSales, LISTIA and UpSells can reuse the same understanding instead of starting from zero.

## Website-generation standard

A generated customer site should be mobile-first, fast, SEO-indexable, include structured data when supported, use the customer branding instead of CloudSales branding, and use a single physical lead form when conversion capture is needed.

Every public lead form should use the CloudSales lead-quality gateway: server validation, honeypot, idempotency, attribution, Cloudflare Turnstile, edge challenge, deduplication and quality scoring. Customer sites on `*.cloudsales.app` should be provisioned through the reusable customer-site provisioner rather than custom one-off deployments.

## Content integrity

Public review text should be paraphrased unless explicit reuse rights exist. Do not fabricate reviewer identities. Exact ratings/review counts must be treated as snapshots because they change.

## Sabor Extra reference implementation

`web/clients/sabor-extra/brand-profile.json` is the first restaurant-oriented reference profile under this standard. NUMA remains the hospitality reference implementation.
