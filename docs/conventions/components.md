# Component conventions

The codebase has two component tiers with distinct roles. Put new work in the right tier; do not mix them.

## Infrastructure layer: `src/components/`

This directory holds head/SEO helpers that are kind-agnostic and have no visual presentation logic:

- **`JsonLd.astro`** - injects a `<script type="application/ld+json">` block. Used by `src/layouts/ThinkinglabsUiPage.astro`.
- **`PwaHead.astro`** - injects PWA manifest links and theme-color meta. Used by `src/layouts/ThinkinglabsUiPage.astro`.

Do not add visual UI components here. If a component affects the page's rendered appearance, it belongs in the design-system layer below.

## Design-system layer: `src/frontend/thinkinglabs-ui/components/`

All visual UI components live here. The key building blocks are:

- **`DetailPage.astro`** - generic hero + body + addendum layout for any detail-shaped page (errors, status pages, non-entity pages). Prefer this for pages that are not backed by a content-kind entity.
- **`EntityDetail.astro`** - wraps `DetailPage.astro` and adds entity-facing relation prop names. Use only for content-kind detail pages backed by repository source data.
- **`EntityFacts.astro`** - renders a `<dl>` of frontmatter metadata fields.
- **`EntitySection.astro`** - a content section with optional heading.
- **`StatusTag.astro`** - a badge for status enum values (`alive`/`dormant`/`shipped`/`abandoned`, `standing`/`reversed`/`superseded`, `open`/`partial`/`closed`). Uses its own scoped styles; new status values render as a neutral tag until added.
- **`ConfidenceMeter.astro`** - visualizes a confidence score in [0,1].
- **`MetricTile.astro`** - a labeled metric display tile.
- **`AppShell.astro`**, **`PageShell.astro`** - top-level page shells.
- **`SiteHeader.astro`**, **`SiteFooter.astro`**, **`SiteNav.astro`** - site-wide navigation and footer.
- Other components (`CalibrationChart`, `NetworkGraph3D`, `ScrollArrows`, etc.) - domain-specific visualizations and interactive elements.

Page compositions live in `src/frontend/thinkinglabs-ui/pages/` (named `*PageComposition.astro`). These are the assembled page layouts that `src/pages/**/*.astro` route files delegate to.

Entity detail hero images are resolved outside frontmatter by local asset convention: place `src/assets/<kind>/<slug>.<ext>` next to the content route shape. Supported extensions are `avif`, `webp`, `png`, `jpg`, and `jpeg`, with earlier formats taking precedence. Detail pages and OG images share this convention and fall back to `src/assets/hero.png`.

## Rules

- Components must stay thin and kind-agnostic. Per-kind logic (for example, grouping projects by status, splitting predictions into pending vs resolved) lives in the page file or a `src/lib/<kind>.ts` helper, never in a component.
- Reach for an existing `EntityDetail`/`EntityFacts`/`EntitySection` composition before introducing kind-specific markup.
- Keep new generic layout behavior in the `Detail*` family so entity and non-entity pages share one implementation.

## Propose-then-curate UX primitives

Any "agent proposes, human confirms" workflow builds on three shared primitives: `runReview` (`src/lib/review-cli.ts`) for the keystroke loop, `editInEditor` (`src/lib/editor.ts`) for editor-mediated mutations, and `patchFrontmatter` (`src/lib/frontmatter.ts`) for writing frontmatter fields back to a content file. New scripts register their own action vocabularies against `runReview`; they do not reimplement the loop, raw-mode guard, or test-injection seam. Background agents (see ADR-009) write proposals to the queue; the same review-cli primitives drain it interactively. See ADR-008 for the rationale.
