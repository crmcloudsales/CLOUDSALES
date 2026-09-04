# CloudSales Email Branding v3 — Canonical Lock

Status: ACTIVE / CANONICAL
Brand: CloudSales
Owner: CloudCo Email Engine
Parent standard: `docs/CLOUDCO_UNIVERSAL_CLEAN_DESIGN_STANDARD.md` (UCDS-1)

## Universal design inheritance

This email standard inherits the CloudCo Universal Clean Design & Communication Standard. Every CloudSales email must remain clean, elegant, professional, simple and brand-first. One purpose, one dominant message, one real differentiator when relevant, and one primary CTA. Do not over-explain, over-sell, add visual noise or fill empty space with unnecessary content.

## Principle

Email providers are transport only. Every provider MUST receive the same CloudSales-rendered identity. Provider-specific templates are not allowed to become the visual source of truth.

## Strict original-brand rule

CloudSales branding is immutable.

- Do not generate, synthesize, redraw, trace, reinterpret, approximate, recolor, restyle or substitute any CloudSales brand asset.
- Do not recreate the CloudSales logo/wordmark with text, HTML, CSS, fonts, gradients or AI and present it as the logo.
- Do not create derivative logo/isotype formats solely to satisfy a third-party platform.
- If a required format does not exist as an approved official asset, the release must wait or omit that asset. A similar-looking substitute is prohibited.
- Acquisition, marketing, lifecycle, welcome/access and other trust-sensitive CloudSales messages must never contain provider watermarks or third-party provider branding.

## Official sender identities

- Transactional / system / access / alerts: `CloudSales <noreply@cloudsales.app>`
- Marketing / commercial: `CloudSales <info@cloudsales.app>`

## Official assets

- Official isotype: `https://app.cloudsales.app/assets/cloudsales-isotipo-official-512.png`
  - Repository: `web/assets/cloudsales-isotipo-official-512.png`
  - Git blob SHA: `caab0fa50857caa21693866ed7ab4daa66e95003`
- Official logo/wordmark: `https://app.cloudsales.app/assets/cloudsales-logo-official-v2.png`
  - Repository: `web/assets/cloudsales-logo-official-v2.png`
  - Git blob SHA: `352db46d2eb45c120e0fc26e9ff3039738b9873b`

The email body may display only the official logo/wordmark asset. Sender/avatar identity may reference only the official isotype asset.

Do not redraw, reinterpret, recolor, crop or substitute either asset. Do not use third-party hosted brand artwork when an official CloudSales-hosted asset exists.

## Inbox avatar / BIMI

Inbox avatar rendering is controlled by the receiving mailbox provider and cannot be forced by the sending ESP. The Email Engine may advertise only the exact official isotype where a receiving platform supports a compatible brand-identity mechanism.

If BIMI or another receiver requires a format for which there is no separately approved official CloudSales asset, DO NOT trace, vectorize, recreate or AI-generate a replacement. Keep the implementation staged until an official approved compatible asset exists.

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

Runtime identifier: `cloudsales_email_v4`

Every CloudSales email sent through the Email Engine must render inside the canonical shell before the provider call. The shell includes:

1. Hidden preheader.
2. Near-black full-width canvas.
3. Premium dark card with restrained border and rounded corners.
4. Pink-to-violet accent line.
5. Exact official CloudSales logo asset centered at the top.
6. Clear heading/body hierarchy.
7. High-contrast CTA using CloudSales pink with violet support.
8. Mobile-responsive spacing and logo sizing without cropping or distortion.
9. Footer with `cloudsales.app` and the canonical message: `La IA trabaja por ti. Tú mantienes el control.`
10. Category-aware footer language for transactional vs marketing/lifecycle messages.

## Provider routing

Providers are transport only and must not alter CloudSales identity.

- Clean-brand providers are eligible for acquisition according to the dynamic routing policy.
- A provider with a confirmed visible watermark is ineligible for acquisition/marketing/lifecycle until a clean-brand configuration is verified.
- Sender currently has a confirmed visible free-tier watermark and is therefore blocked from CloudSales routing until a clean-brand configuration is verified.
- SES and Cloudflare compete dynamically for supported transactional traffic when operationally eligible; Resend is the clean backup; Mailgun remains parked as launch overflow unless explicitly activated by routing policy.

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

Text saying “CloudSales” inside a heading is ordinary copy; it must never be styled to imitate or replace the official logo/wordmark.

## Brand separation

This lock applies only to `brand_key=cloudsales`. LISTIA, UpSells, CloudCo corporate and tenant/customer brands require their own exact official assets and canonical identity locks. CloudSales branding must not be injected into tenant-branded emails unless the product flow explicitly calls for CloudSales identity.
