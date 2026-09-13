# Design QA — Website template gallery

Date: 2026-09-13

Scope: Ownlybiz expert dashboard → Website → Design & templates

Environment: staging only

Stable implementation: https://ownlybiz-git-staging-shugo11111978-4289s-projects.vercel.app/dash/liran1/website-editor

Immutable implementation: https://ownlybiz-4q4jk6fcm-shugo11111978-4289s-projects.vercel.app

Deployment: `dpl_FcXMGnvAui2fKYkcQYF716tW1Cro`

## References and target state

- Defect reference: `/var/folders/1d/2qpd24914cb3dbh0kw76ll_c0000gn/T/codex-clipboard-4af72441-587f-4c0d-9c71-9f967cf733e3.png`
- Kajabi hierarchy reference: `/var/folders/1d/2qpd24914cb3dbh0kw76ll_c0000gn/T/codex-clipboard-a525f917-be32-4022-85db-8e30590cd90b.png`
- Target state: a convincing template gallery in which the website image is the dominant decision surface, while names, descriptions, selection, preview, and apply controls remain explicit.
- Product boundary: preserve Ownlybiz voice, colors, renderer families, data, plan limits, and explicit save behavior; use Kajabi only as a hierarchy reference.

The Kajabi reference and live Ownlybiz implementation were placed in the same browser comparison input for the final visual review. Full-view and focused gallery comparisons were both inspected.

## Implemented visual system

- Replaced every tiny CSS schematic mark with a real original raster website preview.
- Added four distinct Ownlybiz directions: Practice Focus, Quiet Confidence, Field Journal, and After Hours.
- Normal desktop/tablet: two columns; wide content at or above 1320 px: three columns; mobile: one column.
- Each card includes a large preview image, renderer family, name, plain-language description, Current badge, Preview action, and Use foundation action.
- Preview opens the exact high-resolution design image in a modal and never changes the draft.
- Use foundation changes only the unsaved draft selection. Save remains a separate explicit action.
- Personal Assistant remains present in both the Website header and the persistent dashboard sidebar.

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

## Responsive browser evidence

| Viewport | Measured result | Result |
| --- | --- | --- |
| 1512×805 | 1134 px gallery; two 558 px columns; all four images complete. | PASS |
| 1800×1000 | 1322 px gallery; three 428.7 px columns; all four images complete. | PASS |
| 390×844 | 296 px single column; 294×184 preview; two 126.5 px action columns; document width exactly 390 px. | PASS |

No horizontal document overflow was present at any checked viewport. The temporary viewport override was reset before handoff.

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

- Practice Focus Preview opened the full 1600×1000 raster with the message “Preview only — no draft changes.”
- During preview, the Website status remained `Live · saved`, the selected foundation remained Practice Focus, and the draft iframe stayed hidden.
- Choosing Quiet Confidence changed the Current state and status to `Unsaved changes`; no save or publish action was invoked.
- Reload restored the server-saved Practice Focus state and `Live · saved`, proving the selection was not persisted implicitly.
- Use foundation controls were observed disabled while the initial Website request was still settling, then enabled after the authoritative state arrived.
- Personal Assistant was visible in the Website header and the persistent sidebar.
- Browser console warning/error query returned an empty list.

## Iteration history

1. P1: original cards communicated layout with tiny abstract CSS schematics. Fixed with real, high-resolution, original Ownlybiz website previews and a larger responsive gallery.
2. P1: a foundation click during load/save could create a misleading local state. Fixed by disabling Use actions while loading, saving, or in compatibility mode, plus a fail-closed guard in selection logic.
3. P2: image-button focus outline could be clipped by the card edge. Fixed with an inset focus ring.
4. P2: thumbnail zoom ignored reduced-motion preference. Fixed by removing transition and transform under reduced motion.
5. P1: light-theme hover inherited a pale background while retaining white action text. Reproduced in Chrome, fixed with a dark terra hover, and remeasured at `10.10:1`.

No actionable P0, P1, or P2 findings remain.

final result: passed
