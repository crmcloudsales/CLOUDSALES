# CloudSales — Canonical Brand & Language System

Status: CANONICAL
Date locked: 2026-09-03
Scope: CloudSales only

## 1. Purpose
This file is the source of truth for CloudSales commercial branding and language integrity. Functional/product copy may evolve, but the brand system must not drift without an explicit brand decision.

## 2. Official core colors
These three colors were sampled directly from the user-supplied official CloudSales wordmark/isotype assets on 2026-09-03 and are the canonical brand anchors:

- CloudSales Deep Purple: `#2D0A4A` — RGB 45, 10, 74
- CloudSales Pink: `#F955B6` — RGB 249, 85, 182
- CloudSales Off-White: `#F3F4F8` — RGB 243, 244, 248

## 3. Commercial UI support colors
The commercial screenshots supplied on 2026-09-03 use a near-black application canvas. These are UI support colors, not replacements for the official brand anchors:

- Commercial Canvas: `#08070D`
- Commercial Canvas Alternate: `#070713`
- Panel: `#121019`
- Raised Panel: `#17141F`
- Border/Divider: `#37323F`
- Primary Text: `#F3F4F8`
- Secondary Text: `#AAA7B2`
- Secondary Violet Accent: `#C13BE4` (support accent only)

The visual hierarchy must be: near-black canvas + controlled deep-purple fields/glows + CloudSales pink as the primary action/accent + off-white typography. Do not turn the entire product into flat black and do not flood the interface with purple. Pink remains the dominant action color.

## 4. Distribution rules
- Official CloudSales logo: never redraw, recolor, distort, crop, retype or approximate.
- Official Cloudy and AgentCloud characters: never redraw, recolor, reshape or replace without explicit approval.
- Logo in the commercial mobile header should remain compact; target visual height roughly 36–39 px depending on viewport, preserving full wordmark legibility.
- Primary CTAs use CloudSales pink as the dominant color, optionally transitioning into a restrained violet support accent.
- Headline emphasis may transition from off-white to pink; purple is secondary.
- CRM logos retain their own official colors. Do not recolor third-party CRM marks into CloudSales colors.
- The moving CRM band/marquee is part of the preferred commercial presentation and should remain unless explicitly removed.
- Cards should be visibly separated from the canvas; avoid black-on-black loss of hierarchy.

## 5. Product positioning that branding must reinforce
CloudSales is not another CRM and should not be presented as another app the customer has to administer.

Canonical product idea:
- The CRM is infrastructure.
- CloudSales is the AI operating/control layer.
- Cloudy is the user's personal AI operator/assistant.
- AgentCloud is the prospect-facing AI team.
- CloudSales helps reduce junk leads and prioritize better-quality opportunities.
- The customer can control the commercial operation from the palm of their hand instead of living in front of a desktop CRM.

Preferred commercial hierarchy:
1. AI works for you.
2. Better-quality leads / less junk.
3. Your CRM and commercial operation under control.
4. Everything controllable from the palm of your hand.
5. Cloudy coordinates the operation; AgentCloud works on the customer-facing front line.
6. The user retains approvals and control over sensitive actions.

## 6. Cloudy
Cloudy is the personal AI control layer for the business. Within the user's authorized connections and permissions, Cloudy can help configure and operate CRM workflows, prioritize leads and tasks, coordinate marketing and sales, monitor pipeline and appointments, organize content/campaign work, surface exceptions, and explain what needs attention next.

Cloudy is not a decorative chatbot.

## 7. AgentCloud
AgentCloud represents specialized customer-facing AI agents. Depending on enabled capabilities and permissions, agents can qualify prospects, answer questions, follow up, assist sales conversations, help schedule appointments, support customer service, and hand off to a human when appropriate.

Cloudy coordinates; AgentCloud converses and executes front-line work.

## 8. Language integrity — STRICT RULE
**PROHIBITED: mixing full sentences, sections, headings, CTAs, criteria or commercial narratives from different languages on the same localized page.**

Allowed exceptions only:
- product/brand names: CloudSales, Cloudy, AgentCloud;
- established technical names/acronyms: CRM, API, SEO, PWA, OAuth, WhatsApp, Meta, Google, etc.;
- unavoidable technical terms or widely understood industry shorthand when translation would reduce clarity.

Not allowed:
- an English heading followed by a Spanish paragraph on the Spanish page;
- an English CTA inside a Spanish section;
- English feature descriptions on French/Portuguese/German/etc. pages because a translation is missing;
- falling back to English for newly injected commercial blocks while the rest of the page is another language.

If a newly added dynamic section does not yet have a translation for the active locale, it must be hidden/withheld for that locale until translated rather than displayed in the wrong language.

Every new commercial runtime or content module must either:
1. provide complete copy for every locale it renders, or
2. explicitly restrict itself to the locales for which complete copy exists.

## 9. Change-control rule
Automated deploys, SEO fixes, CRM integration changes, authentication work, checkout changes, security changes, copy updates and feature releases must not silently alter the canonical brand anchors, official character identity, official logo or language-integrity rule.

Any intentional change to the three core colors or official character/logo treatment requires an explicit brand decision and a documented update to this canonical file.

## 10. Separation rule
This source of truth belongs to CloudSales. CloudSales commercial branding, commercial copy and release logic should live in the CloudSales repository and CloudSales-specific infrastructure. Do not make CloudSales commercial branding depend on another product's repository, assets or release pipeline.
