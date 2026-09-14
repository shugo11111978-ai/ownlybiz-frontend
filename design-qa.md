# Design QA — Website workspace and Personal Assistant

Date: 2026-09-14

Scope: Ownlybiz expert dashboard → Website, all seven management surfaces, four full-site foundations, custom pages, and Personal Assistant onboarding/guidance

Environment: staging only

Stable implementation: https://ownlybiz-git-staging-shugo11111978-4289s-projects.vercel.app/dash/liran1/website-editor

Immutable implementation: https://ownlybiz-9n1d6h5z1-shugo11111978-4289s-projects.vercel.app

Deployment: `dpl_14ezFnJHa2y9WBJSU4wgnF4rn8Xd` (`READY`, preview target)

Implementation commit: `ba86dc9f1cef8ef511780b3d2305c4be80aa1e09`

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
- Services & Rates is owned by the Sales navigation group and is not duplicated under Practice.
- Light mode applies semantic light tokens to the whole dashboard shell, including the sidebar, navigation text, borders, controls, and status treatments.
- Personal Assistant opens as a complementary side rail: no backdrop, no `aria-modal`, no inert dashboard, and no forced dark theme.
- Preview uses a script-free, same-origin sandboxed Blob document with fragment navigation. All standard and custom pages remain selectable inside the preview without replacing the frame or producing a black/empty view.
- Media exposes eight stable website roles—profile, logo, favicon, social, about, services, reviews, and contact—plus the complete inventory of assets referenced by custom pages and sections.
- Foundation-owned background, surface, text, structure, spacing, and page treatments stay internally coherent. Experts can edit the compatible accent/action/status colors or explicitly restore foundation colors; incompatible legacy design controls are absent.
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
| Sidebar ownership | Services & Rates resolves under Sales; Practice contains no duplicate pricing destination. | PASS |
| Theme ownership | Light mode resolves the sidebar to a warm light gradient with dark semantic navigation text. | PASS |
| Assistant coexistence | The assistant is a complementary rail and the Website tabs remain actionable while it is open. | PASS |
| Preview continuity | Four foundations × 13 selectable pages rendered non-empty content; internal Services navigation remained inside each Blob preview. | PASS |
| Media completeness | Eight fixed media roles and every in-use custom-page/section asset are represented. | PASS |
| Control compatibility | No legacy Design Map or template-conflicting background/surface/text controls remain. | PASS |

## Authenticated responsive browser evidence

| Viewport | Measured result | Result |
| --- | --- | --- |
| Desktop | Full Website hierarchy begins at viewport coordinate zero, with a readable light sidebar, real template previews, explicit draft/live controls, and two-column gallery. | PASS |
| Desktop + assistant | Dashboard remains visible and interactive beside the complementary assistant rail; no backdrop or modal isolation. Pages receives page-specific actions rather than repeated domain guidance. | PASS |
| 390 px mobile | One-column Website content, single-line compact header controls, reachable horizontal surface navigation, a scroll viewport ending above fixed mobile navigation, and no horizontal document overflow. | PASS |

No horizontal document overflow was present at any checked viewport. The authenticated staging mobile capture remained exactly within its viewport, and the temporary viewport override was reset before handoff.

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
- On the deployed staging account, Field Journal was the authoritative saved foundation. Choosing Practice Focus changed only the local draft; reload restored Field Journal, proving no implicit persistence.
- Preview rendered the complete draft HTML without publishing or invoking a save endpoint. Practice Focus, Quiet Confidence, Field Journal, and After Hours each rendered all 13 selectable staging pages with non-empty content.
- Each preview used a Blob URL, had no `srcdoc`, allowed same-origin access only, contained zero scripts, and kept an internal Services link in the preview through `#services` navigation.
- Use foundation controls were observed disabled while the initial Website request was still settling, then enabled after the authoritative state arrived.
- Personal Assistant was visible in the Website header and the persistent sidebar, opened with the expert's name, presented onboarding-aware next steps, and retained the current Website context.
- With Personal Assistant open, the assistant reported `role="complementary"`, `aria-modal` was absent, the backdrop was hidden, the dashboard was neither inert nor `aria-hidden`, and dashboard navigation continued to work.
- Moving from Design & templates to Pages while the assistant remained open changed the contextual title to “Build and organize content pages” and the actions to “Add a content page” and “Preview your website”; unrelated domain guidance was absent from the page-context card.
- The staging account reported Pro Content Pages unlocked, seven pages used of a limit of eight, and the Add Page control enabled.
- The AI entitlement banner distinguished active Content Pages/manual editing from separately inactive AI drafting, so Pro feature entitlement and active billing were no longer conflated.
- The Media surface exposed all eight fixed role inputs and six currently referenced inventory assets. The inventory is data-driven rather than capped at three items.
- First-login automation opened once per expert principal, respected active-live-work and visible-dialog suppression, and persisted onboarding/profile revisions through the authoritative API lifecycle.
- All five custom-page templates and all eight section types rendered meaningful public semantics with authored images, alternative text, responsive layout, and working CTA routing.
- Browser console warning/error query returned an empty list in the visual review.

## Authenticated staging release evidence

- Browser isolation: a brand-new Chrome browser context with no imported cookies, storage, cache, or admin session.
- Authentication: the context logged in only through the staging auth endpoint and asserted the returned/current role was `expert` before dashboard checks continued.
- Read-only boundary: routing blocked every non-login `POST`, `PUT`, `PATCH`, and `DELETE`; `blockedStateChangingRequests` was empty.
- Account authority: `liran1s@gmail.com` resolved as expert `liran1` on Pro; Content Pages reported seven used of eight and remained editable.
- Result: `PASS`; four gallery cards, seven Website surfaces, 52 page/foundation preview combinations, saved/draft/reload authority, eight media roles, Personal Assistant coexistence, desktop layout, and 390 px mobile layout verified.
- Captures: `/private/tmp/ownlybiz-staging-expert-qa-20260914-final/website-design-desktop.png`, `/private/tmp/ownlybiz-staging-expert-qa-20260914-final/website-personal-assistant.png`, and `/private/tmp/ownlybiz-staging-expert-qa-20260914-final/website-design-mobile.png`.
- Credentials were supplied through a silent process environment and were not written to source, output, screenshots, or this report.

## Independent visual signoff

- A second visual reviewer inspected the final desktop, mobile, and Personal Assistant captures after remediation.
- The reviewer confirmed the empty top strip is gone, the repeated heading is resolved, AI drafting entitlement is distinct from Content Pages/manual editing, mobile header controls remain on one line, and Pages guidance is genuinely contextual.
- The remaining authored staging page names are expert-owned test data. They were intentionally preserved because the authenticated QA boundary was read-only.
- Verdict: `PASS`; no actionable P0, P1, or P2 product finding remains.

## Published Content Pages release evidence

- Reproduced the defect in a fresh isolated expert context: the Pro dashboard and `/api/website/me` both held seven published pages, while a cold public load had zero custom page nodes and zero custom navigation links.
- Root cause: cached and preloaded public profiles entered the legacy core website renderer directly, bypassing the canonical public render lifecycle and Content Pages renderer.
- Resolution: preload, cache, and refresh now share one accepted-payload entry point. It creates the existing generation- and identity-fenced lifecycle and invokes the authoritative Content Pages renderer; the legacy renderer is used only when the canonical renderer is unavailable and is never invoked as a second competing path.
- The Content Pages runtime also replays the current accepted lifecycle operation when it registers after an early payload, covering both script-order interleavings without duplicate DOM.
- A separate preload serialization defect removed replacement-pattern copy such as `$1`. Server injection now uses a function replacer, preserving authored page titles, labels, summaries, and body copy exactly.
- Authenticated staging authority remained seven pages, Pro limit eight, website published, revision `sha256-v1:345f8739099962477cde22ab416f5ce9d2b1a147b558d7a587cdd24cce47ff07`.
- Public staging now renders exactly four eligible published pages and navigation entries: Gut Health, Love Reading, `$1 Reading`, and `$1 Love Reading`. The existing safety rule continues to exclude the two profanity test pages and one untouched boilerplate page.
- Cold `/liran1/gut-health`, direct reload, desktop click navigation, Browser Back, Home navigation, and Home reload all preserved the correct route and active page.
- At 390×844, the hamburger exposed all four custom links; Gut Health opened, the menu closed, and direct-route reload kept Gut Health active.
- Cold-bootstrap regression begins with a null render lifecycle and verifies accepted preload/cache application, late real-renderer replay, exact idempotent counts, hidden-navigation direct access, unpublished/placeholder exclusion, and stale-slug rejection.
- Runtime health: zero page exceptions, zero HTTP 4xx/5xx, zero unexpected request failures, and zero unexpected console errors. The read-only boundary deliberately blocked 27 analytics pageview POSTs and no product mutation completed.
- Evidence: `/private/tmp/ownlybiz-content-pages-repro/evidence.json`, `/private/tmp/ownlybiz-content-pages-repro/03-public-gut-health-route.png`, `/private/tmp/ownlybiz-content-pages-postdeploy-audit/audit-summary.md`, `/private/tmp/ownlybiz-content-pages-postdeploy-audit/classified-result.json`, and six independent desktop/mobile screenshots in that audit directory.

## Release integrity

- Stable staging Gut Health and immutable Gut Health routes returned HTTP 200 after the final deployment. Dynamic HTML differs only by Vercel's expected preview-feedback marker.
- Stable alias and immutable preview returned the same exported core artifact ETag, `W/"15ebf3-xdEUXSz4XhAdsgxmcQUW3B6KEaA"`, and content length `1436659` in the independent post-deploy audit.
- Production frontend SHA-256 remained exactly `7ea204fe1593ffe3a6a98219fecc45904ebb40b9c2712a49a62722cfc11d8411` before and after both staging alias updates.
- Production backend remained deployment `99556104-17a4-45e0-bf2f-09b41738008a`, source `139648d76a254b25adfd8ce94cda46609d91d392`, and image `sha256:b38c02db5c15bd202e0489e7e348761484bc60039dabe7a4418c455ddd1dec85`.
- Staging backend remained deployment `2f163f67-1278-4b50-a4e0-7409bdef3b3b`; health/readiness passed with zero recent errors and Stripe test mode.

## Iteration history

1. P1: original cards communicated layout with tiny abstract CSS schematics. Fixed with real, high-resolution, original Ownlybiz website previews and a larger responsive gallery.
2. P1: a foundation click during load/save could create a misleading local state. Fixed by disabling Use actions while loading, saving, or in compatibility mode, plus a fail-closed guard in selection logic.
3. P2: image-button focus outline could be clipped by the card edge. Fixed with an inset focus ring.
4. P2: thumbnail zoom ignored reduced-motion preference. Fixed by removing transition and transform under reduced motion.
5. P1: light-theme hover inherited a pale background while retaining white action text. Reproduced in Chrome, fixed with a dark terra hover, and remeasured at `10.10:1`.
6. P1: light mode left the sidebar on dark-theme tokens. Fixed by moving the shell, navigation, border, and status colors to light semantic ownership; authenticated staging resolved the sidebar to `linear-gradient(180deg,#FFFDF8 0%,#F4EDE3 100%)` with `#241A15` text.
7. P1: Personal Assistant behaved like a modal/darkening layer. Fixed as a nonmodal complementary rail with no overlay, inert state, or hidden dashboard; navigation remained usable while open.
8. P1: preview navigation could replace or blank the document. Fixed with one script-free Blob document and fragment-owned page selection; 52 deployed preview combinations and internal navigation remained non-empty.
9. P1: media management exposed only a small fixed subset. Fixed with eight semantic media roles plus a data-driven referenced-asset inventory.
10. P1: independent design controls could contradict a selected foundation. Fixed by making structure/background/surface/text foundation-owned and exposing only compatible brand controls with an explicit restore action.
11. P1: a legacy 50 px dashboard reserve created an empty dark strip and misaligned the assistant rail. Removed the reserve; desktop and mobile now begin at viewport coordinate zero.
12. P1: Website Pages repeated global domain guidance in its page-context card. Added exact guidance and safe navigation/focus actions for all seven Website surfaces; Pages now prioritizes adding and previewing content.
13. P1: Pro Content Pages and inactive AI drafting appeared contradictory. Reworded the banner to state that manual editing and Content Pages remain available while AI drafting separately requires active Pro/Scale billing.
14. P2: mobile header labels wrapped, the Website heading repeated, and fixed navigation overlapped the scroll viewport. Added compact state-preserving labels, changed the workspace heading to “Manage your website,” and ended the mobile main viewport above navigation.
15. P1: published Content Pages were present in the authoritative document but absent from cold public loads because preload/cache boot bypassed the canonical render lifecycle. Routed every accepted profile through one canonical entry point and added late-renderer replay plus null-lifecycle coverage.
16. P1: authored `$1` labels and copy were altered during server-side preload insertion by replacement-string semantics. Replaced string interpolation with a function replacer and verified exact copy in SSR and live staging.

No actionable P0, P1, or P2 findings remain.

final result: passed
