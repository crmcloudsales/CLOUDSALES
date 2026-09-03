# CloudSales Email Branding v3 — Canonical Lock

Status: ACTIVE / CANONICAL
Brand: CloudSales
Owner: CloudCo Email Engine

## Principle

Email providers are transport only. Sender, Resend, Brevo, Mailjet and future providers MUST receive the same CloudSales-rendered HTML. Provider-specific templates are not allowed to become the visual source of truth.

## Official sender identities

- Transactional / system / access / alerts: `CloudSales <noreply@cloudsales.app>`
- Marketing / commercial: `CloudSales <info@cloudsales.app>`

## Official assets

- CloudSales logo: `https://app.cloudsales.app/assets/cloudsales-logo-official-v2.png`
- Do not redraw, reinterpret, recolor, crop or substitute the logo.
- Do not use third-party hosted brand artwork when an official CloudSales-hosted asset exists.

## Canonical palette

- Canvas: `#08070D`
- Deep purple: `#2D0A4A`
- Panel: `#121019`
- Raised panel: `#17141F`
- Border: `#37323F`
- Primary text: `#F3F4F8`
- Secondary text: `#AAA7B2`
- CloudSales pink: `#F955B6`
- Support violet: `#C13BE4`

Old pink variants such as `#ff5b9d` are non-canonical and must not be introduced in new templates.

## Canonical shell

Runtime identifier: `cloudsales_email_v3`

Every CloudSales email sent through the Email Engine must render inside the canonical shell before the provider call. The shell includes:

1. Hidden preheader.
2. Near-black full-width canvas.
3. Premium dark card with restrained border and rounded corners.
4. Pink-to-violet accent line.
5. Official CloudSales logo centered at the top.
6. Clear heading/body hierarchy.
7. High-contrast CTA using CloudSales pink with violet support.
8. Mobile-responsive spacing and logo sizing.
9. Footer with `cloudsales.app` and the canonical message: `La IA trabaja por ti. Tú mantienes el control.`
10. Category-aware footer language for transactional vs marketing/lifecycle messages.

## Provider routing

FREE-FIRST / ZERO-SPEND applies before paid usage.

Current provider adapters supported by the dispatcher:

- Sender
- Resend
- Brevo
- Mailjet

All providers receive the same rendered HTML. Provider-specific branding is prohibited.

## Delivery safety

The dispatcher must atomically claim a queued/failed job by moving it to `sending` before contacting a provider. If another worker sees the same job in `sending`, `sent` or `delivered`, it must return idempotently and MUST NOT send another copy.

The job idempotency key is preserved and forwarded to providers that support native idempotency.

## Template rules

Stored CloudSales templates should contain semantic content fragments, not competing full-page brand shells. The dispatcher owns the final visual shell.

Allowed content primitives:

- `<h1>` / `<h2>`
- `<p>`
- `<a href="...">CTA</a>`
- Small explicitly styled CloudSales kicker text where useful

The dispatcher applies the canonical typography and CTA treatment.

## Brand separation

This lock applies only to `brand_key=cloudsales`. LISTIA, CloudCo corporate and tenant/customer brands require their own canonical email shells. CloudSales branding must not be injected into tenant-branded emails unless the product flow explicitly calls for CloudSales identity.
