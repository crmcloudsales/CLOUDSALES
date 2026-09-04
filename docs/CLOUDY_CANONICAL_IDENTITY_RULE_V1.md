# Cloudy Canonical Identity Rule v1

Status: ACTIVE / CANONICAL
Scope: CloudSales, CloudCo AI Engine, Email Engine, Social Engine, PWA, web, mobile, graphics, documents, generated UI and every customer-facing surface where Cloudy appears.

## Identity

Cloudy is the personal AI business assistant/operator inside CloudSales.

Cloudy is NOT a cloud.
Cloudy is NOT a cloud icon.
Cloudy is NOT a generic bot or chatbot.
Cloudy must never be represented by a cloud glyph, generic robot, generic sparkles, or substitute mascot.

The word “Cloudy” is the assistant's name; it is not permission to associate the character with cloud iconography.

## Official visual source

Use only the approved official Cloudy character asset as the visual source of truth.

Current canonical asset in this repository:
`web/assets/marketing/cloudy-official.webp`

For compact UI surfaces such as the CloudSales bottom navigation, microphone control, floating assistant and notification avatar, derive a crop/silhouette from the HEAD of the official Cloudy asset. Do not redraw or reinterpret the head.

## Bottom-navigation rule

The center Cloudy action in the PWA must:
- occupy the center of the five-button bottom navigation;
- use the official Cloudy head as its recognizable mark;
- pulse/breathe subtly to communicate availability;
- open the voice-first Cloudy experience with one action;
- never use a cloud symbol as the icon.

## Product behavior

Cloudy is an AI assistant/operator that does the work and brings the user decisions, approvals, priorities and exceptions.

The UI should therefore communicate:
- Cloudy worked while the user was away;
- what changed;
- what needs the user's decision;
- what Cloudy recommends;
- what can be approved/delegated immediately.

Avoid making the user operate Cloudy like a traditional chatbot or CRM screen.

## Voice behavior

Cloudy is voice-first:
- one primary microphone action;
- natural turn-taking;
- automatic spoken response;
- wake word “Cloudy” where the browser/platform allows it;
- calm, warm, capable, direct, never salesy;
- native pronunciation for the active language.

## Inheritance

This rule inherits the CloudCo Universal Clean Design & Communication Standard (UCDS-1): clarity over quantity, brand over noise, differentiation over hype, one message, one action, always clean.

Any future implementation that uses a cloud icon or generic bot to represent Cloudy is a branding regression and should fail design review.