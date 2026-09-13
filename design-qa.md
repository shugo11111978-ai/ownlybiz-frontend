# Design QA — Website workspace and Personal Assistant

Date: 2026-09-14

Scope: Ownlybiz expert dashboard → Website, all seven management surfaces, four full-site foundations, custom pages, and Personal Assistant onboarding/guidance

Environment: staging only

Stable implementation: https://ownlybiz-git-staging-shugo11111978-4289s-projects.vercel.app/dash/liran1/website-editor

Immutable implementation: https://ownlybiz-hwyevc5gr-shugo11111978-4289s-projects.vercel.app

Deployment: `dpl_22opEeCscvSLn28EED8w3Z6MDgMN`

Source commit: `15607371d5dda5c90830d9fa3a0210d4fb31e94e`

## References and target state

- Defect reference: `/var/folders/1d/2qpd24914cb3dbh0kw76ll_c0000gn/T/codex-clipboard-4af72441-587f-4c0d-9c71-9f967cf733e3.png`
- Kajabi hierarchy reference: `/var/folders/1d/2qpd24914cb3dbh0kw76ll_c0000gn/T/codex-clipboard-a525f917-be32-4022-85db-8e30590cd90b.png`
- Target state: a convincing template gallery in which the website image is the dominant decision surface, while names, descriptions, selection, preview, and apply controls remain explicit.
- Product boundary: preserve Ownlybiz voice, colors, renderer families, data, plan limits, and explicit save behavior; use Kajabi only as a hierarchy reference.

The Kajabi reference and live Ownlybiz implementation were placed in the same browser comparison input for the final visual review. Full-view, focused gallery, Personal Assistant, and mobile comparisons were inspected. Kajabi's useful hierarchy and confidence patterns informed the review; Ownlybiz retains its own voice, visual identity, data model, and explicit draft/save behavior.

## Implemented visual system

- Replaced every tiny CSS schematic mark with a real original raster website preview.
- Added four distinct Ownlybiz directions: Practice Focus, Quiet Confidence, Field Journal, and After Hours.
- Normal desktop/tablet: two columns; wide content at or above 1320 px: three columns; mobile: one column.
- Each card includes a large preview image, renderer family, name, plain-language description, Current badge, Preview action, and Use foundation action.
- Preview renders the complete selected foundation across the expert's content and never changes the draft.
- Use foundation changes only the unsaved draft selection. Save remains a separate explicit action and applies the chosen renderer across Home, About, Services, Reviews, Book, Contact, custom pages, and account surfaces.
- Personal Assistant remains present in both the Website header and the persistent dashboard sidebar.
- Website management is consolidated into Overview, Design & templates, Pages, Menu, Media, Domains, and Search & analytics.
- Custom pages preserve every authored section, template, image, image alternative, CTA, destination, ordering position, and stable section identity.
- Personal Assistant is account-personalized, feature-aware, page-aware, onboarding-aware, and identity fenced. It recommends and navigates, but does not silently change the expert's practice.

## Fidelity review

| Surface | Evidence | Result |
| --- | --- | --- |
| Information hierarchy | Large website thumbnails now dominate each card, matching the useful hierarchy of the Kajabi reference without reproducing its branding or creative. | PASS |
| Typography | Ownlybiz dashboard typography remains intact; the preview art uses original editorial/sans combinations appropriate to each foundation. | PASS |
| Spacing and density | 18 px gallery gaps, 16 px card copy/action padding, consistent media aspect, and balanced two-/three-/one-column layouts. | PASS |
| Color | Warm Ownlybiz dashboard palette, olive status treatment, terra primary action, lime dark-mode action; no Kajabi palette copied. | PASS |
| Image quality | Practice Focus is 1600×1000; the other three are 1586×992. All four loaded at intrinsic resolution with 200–350 KB JPEG payloads. | PASS |
| Copy | Original Ownlybiz names and expert-oriented descriptions; no Kajabi template names, logos, or marketplace claims. | PASS |
| Selection clarity | Visible Current badge, selected border, synchronized `aria-pressed`, and explicit unsaved status after selection. | PASS |
| Full-site application | Every saved foundation owns a complete responsive renderer across standard, custom, booking, and account surfaces. | PASS |
| Personal guidance | Personalized first-login help, contextual next steps, complete Ownlybiz feature knowledge, memory consent, history fallback, and safe recovery are present. | PASS |

## Responsive browser evidence

| Viewport | Measured result | Result |
| --- | --- | --- |
| 1512×805 | 1134 px gallery; two 558 px columns; all four images complete. | PASS |
| 1800×1000 | 1322 px gallery; three 428.7 px columns; all four images complete. | PASS |
| 390×844 | 296 px single column; 294×184 preview; two 126.5 px action columns; document width exactly 390 px. | PASS |

No horizontal document overflow was present at any checked viewport. The authenticated staging mobile capture also remained exactly within its viewport. The temporary viewport override was reset before handoff.

## Contrast and accessibility

Measured light-theme ratios:

- Card description: `7.14:1`
- Renderer family: `6.68:1`
- Preview action: `16.75:1`
- Use foundation action: `7.77:1`
- Current badge: `7.98:1`
- Use foundation hover after remediation: `10.10:1`

Measured dark-theme ratios after compositing translucent card surfaces:

- Card description: `8.76:1`
- Renderer family: `15.93:1`
- Preview action: `17.56:1`
- Use foundation action: `15.67:1`
- Current badge: `13.13:1`

All normal text/action states tested exceed WCAG AA. Image buttons have descriptive names, fixed intrinsic dimensions, visible inset keyboard focus, and lazy/async loading. Reduced-motion mode removes the thumbnail zoom transition and transform.

## Interaction verification

- The deterministic browser flow saved and reloaded Practice Focus → Quiet Confidence → Field Journal → After Hours → Practice Focus. Every transition rendered all standard pages, one AI custom page, account surfaces, booking actions, and custom-page CTA behavior.
- On the deployed staging account, After Hours was the authoritative saved foundation. Choosing Practice Focus changed only the local draft; reload restored After Hours, proving no implicit persistence.
- Preview rendered the complete draft HTML without publishing or invoking a save endpoint.
- Use foundation controls were observed disabled while the initial Website request was still settling, then enabled after the authoritative state arrived.
- Personal Assistant was visible in the Website header and the persistent sidebar, opened with the expert's name, presented onboarding-aware next steps, and retained the current Website context.
- First-login automation opened once per expert principal, respected active-live-work and visible-dialog suppression, and persisted onboarding/profile revisions through the authoritative API lifecycle.
- All five custom-page templates and all eight section types rendered meaningful public semantics with authored images, alternative text, responsive layout, and working CTA routing.
- Browser console warning/error query returned an empty list in the visual review.

## Authenticated staging release evidence

- Browser isolation: a brand-new Chrome browser context with no imported cookies, storage, cache, or admin session.
- Authentication: the context logged in only through the staging auth endpoint and asserted the returned/current role was `expert` before dashboard checks continued.
- Read-only boundary: routing blocked every non-login `POST`, `PUT`, `PATCH`, and `DELETE`; `blockedStateChangingRequests` was empty.
- Result: `PASS`; four gallery cards, seven Website surfaces, saved/draft/reload authority, Personal Assistant context, desktop layout, and 390 px mobile layout verified.
- Captures: `/private/tmp/ownlybiz-staging-expert-qa/website-design-desktop.png`, `/private/tmp/ownlybiz-staging-expert-qa/website-personal-assistant.png`, and `/private/tmp/ownlybiz-staging-expert-qa/website-design-mobile.png`.
- Credentials were supplied through a silent process environment and were not written to source, output, screenshots, or this report.

## Iteration history

1. P1: original cards communicated layout with tiny abstract CSS schematics. Fixed with real, high-resolution, original Ownlybiz website previews and a larger responsive gallery.
2. P1: a foundation click during load/save could create a misleading local state. Fixed by disabling Use actions while loading, saving, or in compatibility mode, plus a fail-closed guard in selection logic.
3. P2: image-button focus outline could be clipped by the card edge. Fixed with an inset focus ring.
4. P2: thumbnail zoom ignored reduced-motion preference. Fixed by removing transition and transform under reduced motion.
5. P1: light-theme hover inherited a pale background while retaining white action text. Reproduced in Chrome, fixed with a dark terra hover, and remeasured at `10.10:1`.

No actionable P0, P1, or P2 findings remain.

final result: passed
