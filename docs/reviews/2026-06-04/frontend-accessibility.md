# Frontend / Astro / Accessibility Review - Thinking Labs (2026-06-04)

**Reviewer:** Frontend/A11y · **Branch:** feat-design-v2 @ 1e73fd0

---

## Executive summary

The v2 design is architecturally strong: 100% static Astro, zero React islands via `client:` directives (all JS is vanilla-DOM scripts or dynamically-imported React via a custom loader), a well-structured CSS token system, thorough `prefers-reduced-motion` coverage, and a genuinely good noscript fallback on the NetworkGraph3D page. The primary accessibility concerns cluster around two separate navigation systems that exist in parallel (SiteHeader and SiteNav), heading-level inconsistencies across the two layout families, the NetworkGraph3D canvas being completely keyboard-inaccessible, and a missing skip-to-main-content link across the entire site. SEO is solid with one notable gap: several listing pages pass personal-name copy in their title tags that may conflict with the `metadataTitle` sanitizer. Overall frontend/a11y health: **B+ - thoughtfully constructed with a few fixable gaps**.

---

## Scope & method

Static read of all Astro component files in `src/frontend/thinkinglabs-ui/`, `src/layouts/`, `src/components/`, `src/pages/`, and supporting TS modules (`src/lib/seo.ts`, `src/lib/structured-data.ts`, `src/lib/css-tokens.ts`, `src/frontend/thinkinglabs-ui/styles.css`). No build was run; findings are based on source analysis only.

---

## Findings

### [Critical] NetworkGraph3D canvas is entirely keyboard-inaccessible

**Location:** `src/frontend/thinkinglabs-ui/components/NetworkGraph3D.client.ts:228–250`

**Observation:** The Three.js scene responds only to `pointermove`, `pointerleave`, `pointerdown`, and `pointerup`. There is no keyboard listener for navigating between nodes or following node links. The canvas element (`renderer.domElement`) is appended directly to the DOM with no `tabIndex`, so it cannot receive focus at all. The hover tooltip (`data-graph-hover-label`) uses `aria-hidden="true"` (set in the Astro template at line 43 of `NetworkGraph3D.astro`), so its label text is invisible to screen readers even when visible.

**Impact:** Keyboard-only users and AT users cannot interact with the graph at all. The noscript fallback (lines 57–72 of `NetworkGraph3D.astro`) is excellent - but it renders only for JS-disabled browsers, not for keyboard users who have JS enabled. WCAG 2.1 SC 2.1.1 (Keyboard, Level A), SC 4.1.2 (Name, Role, Value, Level A).

**Recommendation:** Add `tabIndex={0}` to the canvas via `renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute("role", "application"); renderer.domElement.setAttribute("aria-label", "3D knowledge graph")`. Implement arrow-key navigation to cycle through focused nodes (`Tab`/`Shift+Tab` or arrow keys to select, `Enter` to follow a link). At minimum, expose the hover label as a live region so screen readers hear node names on focus change. Consider also exposing the noscript list as a visually hidden `<details>` for AT users.

**Effort:** L

---

### [Critical] Missing site-wide skip-to-main-content link

**Location:** `src/layouts/ThinkinglabsUiPage.astro:33–65` and `src/frontend/thinkinglabs-ui/components/AppShell.astro:15–31`

**Observation:** Neither the document layout nor any shell component renders a skip link. The SiteHeader navigation panel and SiteNav badge both appear before `<main>` in the DOM. Without a skip link, keyboard users must Tab through all nav items on every page load. WCAG 2.4.1 (Bypass Blocks, Level A).

**Recommendation:** Add a skip link as the very first focusable element inside `<body>` in `ThinkinglabsUiPage.astro`. Target `#main-content` and add `id="main-content"` to the `<main>` element in `AppShell.astro` (line 17) or `PageShell.astro` (line 16). Example:

```html
<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>
```

**Effort:** S

---

### [High] SiteNav checkbox-pattern navigation has no Escape/Tab-trap handling

**Location:** `src/frontend/thinkinglabs-ui/components/SiteNav.astro:45–85`

**Observation:** The SiteNav (used on detail/listing pages via `HalfHeroLayout` and `PageShell`) uses a CSS `<input type="checkbox" class="sr-only">` + `<label>` + `peer-checked` pattern to toggle a full-viewport overlay nav panel. The panel is `fixed inset-0` when open. Unlike SiteHeader (which has a complete JS-driven `Escape` handler, `focusout` guard, `inert` toggle, and focus-return), the SiteNav has no keyboard handling whatsoever: no `Escape` to close, no focus trap within the open panel, and no focus-return to the trigger on close. The `aria-label="Close navigation"` on the inner `<label>` is correct, but without trapping Tab focus inside the open overlay a user can Tab out of the panel into the (now invisible) page content behind it.

**Impact:** WCAG 2.1 SC 2.1.2 (No Keyboard Trap, Level A - paradoxically, the trap is missing, not excessive), 2.4.3 (Focus Order, Level A). Screen-reader users will have no announced way to close the menu with the keyboard.

**Recommendation:** Add a small script block (matching the SiteHeader pattern) that: (1) listens for `Escape` on `document` while the checkbox is checked and programmatically unchecks it, (2) moves focus back to the `<label>` trigger on close, and (3) traps Tab within the nav panel while it is open. Alternatively, migrate to the SiteHeader component on the remaining pages, since it already implements these behaviors correctly.

**Effort:** M

---

### [High] `role="dialog"` + `aria-modal="false"` on the SiteHeader nav panel is semantically incorrect

**Location:** `src/frontend/thinkinglabs-ui/components/SiteHeader.astro:68–70`

**Observation:** The nav panel carries `role="dialog"` but `aria-modal="false"`. The ARIA spec says the `dialog` role implies a modal context. When `aria-modal="true"` (the normal usage), AT restricts the virtual cursor to the dialog. Setting `aria-modal="false"` on a `role="dialog"` element creates an unusual combination: AT will announce it as a dialog but won't restrict the virtual cursor. The correct semantic for a disclosure nav panel is either `role="navigation"` (but that clashes with the inner `<nav>`) or simply no role, relying on the `inert` attribute (already present) to block AT access when closed and focus management to constrain interaction when open.

**Impact:** Screen readers may behave inconsistently: some will apply dialog-mode navigation rules despite `aria-modal="false"`, others will not. WCAG 4.1.2 (Name, Role, Value, Level A).

**Recommendation:** Remove `role="dialog"` and `aria-modal="false"` from the nav panel div. The existing `inert` attribute when closed and `aria-expanded` on the toggle button are sufficient. The `<nav aria-label="Primary">` inside already provides the correct navigation landmark.

**Effort:** S

---

### [High] DetailHero uses `<h2>` for the page title; produces a skipped heading level

**Location:** `src/frontend/thinkinglabs-ui/components/DetailHero.astro:34`

**Observation:** `DetailHero` renders the detail page title as `<h2>`. There is no `<h1>` anywhere in the `DetailPage` → `PageShell` → `DetailHero` stack. `PageShell` renders a plain `<main>`; `ThinkinglabsUiPage` renders only `<body><slot /></body>`. The document therefore begins with an `<h2>`, violating heading hierarchy. WCAG 1.3.1 (Info and Relationships, Level A) and 2.4.6 (Headings and Labels, Level AA).

**Recommendation:** Change `<h2>` to `<h1>` in `DetailHero.astro` (line 34). Then, any secondary headings within the detail body prose (already rendered via Astro `<Content />`) should remain at `<h2>` and below, which they naturally will.

**Effort:** S

---

### [Medium] AppShell outer element is `<article>` rather than a neutral container

**Location:** `src/frontend/thinkinglabs-ui/components/AppShell.astro:15`

**Observation:** The outermost shell element is `<article class="tl-shell">`. The `<article>` landmark implies self-contained, independently redistributable content (like a blog post or news story). A site chrome shell wrapping the header, main scroll area, and HUD is not an article in this semantic sense. Screen readers announce `<article>` landmarks explicitly. Additionally, the `<article>` wraps `<main>`, which is valid HTML but results in an unusual landmark tree.

**Impact:** Minor AT confusion; screen readers announce "article" before the page content. WCAG 1.3.1 (Info and Relationships).

**Recommendation:** Change `<article class="tl-shell">` to `<div class="tl-shell">`.

**Effort:** S

---

### [Medium] SiteFooter is an empty `<footer>` element

**Location:** `src/frontend/thinkinglabs-ui/components/SiteFooter.astro:1`

**Observation:** The footer landmark is empty: `<footer class="tl-site-footer"></footer>`. It is positioned fixed, bottom-right, using `mix-blend-mode: difference` to show branded content - but currently has no child content rendered into it. Empty landmarks can confuse AT users navigating by landmarks, as the footer announces itself but contains nothing.

**Impact:** Low severity in practice since most AT users skip empty landmarks, but it is a landmark correctness issue.

**Recommendation:** Either (a) render actual footer content inside this element (copyright, etc.), or (b) add `aria-hidden="true"` to suppress it from the AT landmark tree until it has content, or (c) change the element to `<div>` if it is purely decorative.

**Effort:** S

---

### [Medium] NetworkGraph3D: no `prefers-reduced-motion` guard on the continuous render loop

**Location:** `src/frontend/thinkinglabs-ui/components/NetworkGraph3D.client.ts:273–286`

**Observation:** The Three.js scene renders a continuously animated `requestAnimationFrame` loop that includes a slow camera orbit (`driftEnabled`). The orbit can be paused by user interaction (`controls.addEventListener("start", ...)`) but there is no check for `prefers-reduced-motion`. The EntityShaderSurface client (`EntityShaderSurface.client.ts:36`) already implements this pattern correctly - it calls `window.matchMedia("(prefers-reduced-motion: reduce)").matches` and returns early before mounting the shader. The NetworkGraph3D client does not.

**Impact:** Users who require reduced motion for vestibular reasons will see a continuously orbiting 3D scene. WCAG 2.3.3 (Animation from Interactions, Level AAA - advisory, but strongly recommended), and effectively SC 2.2.2 (Pause, Stop, Hide) since the orbit is not user-controlled.

**Recommendation:** At the top of `init()`, check `window.matchMedia("(prefers-reduced-motion: reduce)").matches` and if true, set `driftEnabled = false` and do not start the orbit. The user can still drag/zoom; only the auto-orbit is suppressed.

**Effort:** S

---

### [Medium] Two-navigation-system architecture creates potential duplication for AT users

**Location:** `src/frontend/thinkinglabs-ui/components/SiteHeader.astro` and `src/frontend/thinkinglabs-ui/components/SiteNav.astro`

**Observation:** The codebase has two distinct navigation systems. `SiteHeader` is the primary carousel-style nav used by `AppShell`-based pages (gallery/document mode). `SiteNav` is the badge+overlay nav used by `HalfHeroLayout`-based pages (entity listing and detail pages). Both expose full site navigation but the two systems co-exist in some page compositions: for example, `DetailPage` uses `SiteNav` via the `nav` slot, while some pages that use `AppShell` do not. There is no page that renders both simultaneously, but the divergence means the accessibility of the nav depends entirely on which layout family is active, with the SiteHeader implementation being substantially more accessible.

**Impact:** Inconsistent experience for keyboard/AT users depending on the page type. Not a direct WCAG violation, but an architectural risk.

**Recommendation:** Document which layout uses which nav. Prioritize applying the SiteHeader's keyboard handling pattern (Escape, inert, focus-return) to SiteNav as well (see the [High] finding above).

**Effort:** M

---

### [Medium] Home page `<h1>` is inside a `pointer-events-none` fixed div and may be clipped visually

**Location:** `src/pages/index.astro:54–58`

**Observation:** The home page `<h1>` ("thinkinglabs") is absolutely positioned (`absolute left-4 top-14`) inside a `fixed inset-0 pointer-events-none` div. It renders white text over the hero image. On dark mode or if the image fails to load, the heading text may be low-contrast against the page background. The `alt` text on the hero image reads "Screenshot of thinkinglabs home page" which is technically correct but could be improved - the image is decorative from the document structure's point of view since the `<h1>` already provides the title.

**Impact:** Potential contrast failure in edge cases; descriptive but redundant alt text.

**Recommendation:** Consider `alt=""` on the home hero image since the `<h1>` provides the essential text, or refine to describe what the image actually shows (the site UI). Ensure the `<h1>` has a visible text shadow or `drop-shadow` to guarantee contrast against all image states.

**Effort:** S

---

### [Medium] `aria-live="polite"` HUD announces to screen readers but may be confusing

**Location:** `src/frontend/thinkinglabs-ui/components/AppShell.astro:24–28`

**Observation:** The `.tl-selected-hud` element carries `aria-live="polite"` and `aria-atomic="true"`. It updates dynamically as the user scrolls through the gallery to show the name of the currently centered item ("Selected · Thoughts", etc.). This is a decorative affordance for sighted users navigating the carousel; it is the visual "selected" indicator driven by `data-selected-label` intersection logic. The live region will announce the category name every time the scroll stops near a new card, which may be verbose and disorienting for screen-reader users.

**Impact:** Potentially excessive announcements during gallery scroll. WCAG 3.2.1 (On Focus) adjacent concern.

**Recommendation:** Add `aria-hidden="true"` to the HUD element to suppress announcements - the navigation links inside the nav panel already convey which pages exist and are accessible. If retaining the live region is desired, add a sufficient delay (via `setTimeout`) before updating `textContent` so rapid scroll does not fire multiple announcements.

**Effort:** S

---

### [Low] SiteNav `<label>` toggle provides accessible name but no visible focus ring

**Location:** `src/frontend/thinkinglabs-ui/components/SiteNav.astro:46–50`

**Observation:** The nav toggle `<label for="tl-nav">` has `aria-label="Open navigation"` which is good. However, the label has no explicit `:focus-visible` CSS rule. The underlying `<input type="checkbox" class="sr-only">` is hidden from view. When a keyboard user focuses the checkbox (which is `sr-only`, so absolutely positioned off-screen), the label does not show a visible focus indicator because the `:focus-visible` pseudo-class applies to the input, not the label. SiteHeader avoids this by using a real `<button>` with an explicit `focus-visible` rule at line 489.

**Impact:** Keyboard users cannot see which element has focus on the detail page nav toggle. WCAG 2.4.11 (Focus Appearance, Level AA in 2.2), 2.4.7 (Focus Visible, Level AA in 2.1).

**Recommendation:** Add a CSS rule in SiteNav that applies a visible focus ring to the label when the sibling checkbox is focused: `input.tl-nav-toggle:focus-visible + label { outline: 2px solid var(--tl-focus); outline-offset: 4px; }`.

**Effort:** S

---

### [Low] `og:logo` is non-standard; consider replacing with `og:image:type`

**Location:** `src/layouts/ThinkinglabsUiPage.astro:49`

**Observation:** The layout emits `<meta property="og:logo" content={logo} />`. `og:logo` is not part of the Open Graph Protocol specification. It is supported by some platforms but ignored by most. The standard for a logo/icon hint is `og:image` (already present) or the Schema.org `logo` property (already handled in structured data). Additionally, `og:image:type` (e.g., `image/png`) is absent, though most scrapers infer it from the URL extension.

**Impact:** Low; the `og:logo` tag is ignored by Twitter/X and LinkedIn. No functional breakage.

**Recommendation:** Remove `og:logo` or replace with a standard `og:image:type` meta tag. The `maskable-icon-512x512.png` is already referenced in the PWA manifest and Schema.org data.

**Effort:** S

---

### [Low] `tl-selected-hud` uses `mix-blend-mode: difference` which can fail contrast requirements

**Location:** `src/frontend/thinkinglabs-ui/components/AppShell.astro:139–141`

**Observation:** The `.tl-selected-hud` (the "Selected · [category]" label) uses `mix-blend-mode: difference` with `--tl-difference-ink: #ffffff`. Blend mode rendering means the actual rendered contrast ratio varies dynamically based on whatever content is behind the text. Against a white background this renders black text (acceptable); against a mid-gray gradient stop it could render near-zero contrast.

**Impact:** Unpredictable contrast. WCAG 1.4.3 (Contrast Minimum, Level AA).

**Recommendation:** Since this element is `aria-live` (see finding above) but purely decorative in isolation, the simplest fix is to add `aria-hidden="true"`. If it is retained as content, ensure the blend layer always sits over a background dark enough to maintain 4.5:1 for the resulting rendered color.

**Effort:** S

---

### [Low] `<DetailHero>` image alt falls back to `title` - heroic images for error pages carry literal page titles

**Location:** `src/frontend/thinkinglabs-ui/components/DetailHero.astro:21` + `src/pages/404.astro:15–16`

**Observation:** `alt={heroAlt ?? title}` means if `heroAlt` is omitted, the image gets the page title as its alt text. For the error pages (`404.astro` line 16, `500.astro` line 16), `heroAlt="Page not found"` and `"Something broke"` are explicit and appropriate. However, the pattern means any future callsite that omits `heroAlt` on a decorative hero will get a potentially redundant alt (since the `<h2>` immediately below already states the title). This is a maintenance risk rather than a current bug.

**Impact:** Low redundancy risk.

**Recommendation:** Document in the component interface that `heroAlt=""` is the correct value for decorative hero images where the adjacent heading already describes the content.

**Effort:** S

---

### [Low] Listing page title strings contain personal-name copy that may survive `metadataTitle`

**Location:** `src/pages/thoughts/index.astro:14`, `src/pages/about.astro:46`, `src/pages/contact.astro:8`

**Observation:** `title="Thoughts - Tom"` passes the string `"Tom"` through `metadataTitle()`. The function strips `Tom Wild` and `Tom` suffixes but only via `LEGACY_TITLE_SUFFIX` which matches end-of-string. `"Thoughts - Tom"` will be cleaned by the regex to produce `"Thoughts | thinkinglabs"` (correct). `"About - Tom"` similarly. However, this means the input strings contain legacy copy that relies on a sanitizer. If the sanitizer were updated, the title rendering could change unexpectedly.

**Impact:** Low fragility risk; not a current accessibility or SEO issue.

**Recommendation:** Update the title strings to not include personal-name copy at the source: `title="Thoughts"`, `title="About"`, `title="Contact"`. Let `metadataTitle` only add the site-name suffix.

**Effort:** S

---

### [Info] No Twitter `twitter:creator` or `twitter:site` tags

**Location:** `src/layouts/ThinkinglabsUiPage.astro:53–57`

**Observation:** Twitter Card tags are present (`summary_large_image`, title, description, image) but `twitter:creator` and `twitter:site` are absent. These are optional but improve attribution in Twitter's card display when the author has a Twitter/X handle.

**Impact:** Cards render correctly; attribution is missing.

**Recommendation:** If the author has an active Twitter/X handle, add `<meta name="twitter:creator" content="@handle">`. If not, omit.

**Effort:** S

---

### [Info] Scrollbar is globally hidden (`scrollbar-width: none`) with no visible indicator

**Location:** `src/frontend/thinkinglabs-ui/components/AppShell.astro:118` and `src/frontend/thinkinglabs-ui/styles.css:744`

**Observation:** The primary scroll container suppresses the browser scrollbar. The `ScrollArrows` component provides pagination affordance, and the HUD announces the current section. However, users who rely on the scrollbar as a visual position indicator have no equivalent.

**Impact:** Orientation concern for some users. Not a hard WCAG violation at the current spec level but conflicts with the spirit of WCAG 2.4.8 (Location, Level AAA).

**Recommendation:** Consider a thin custom scroll indicator (CSS-only, using `scroll-timeline` or `position: sticky`) as a non-interactive position tracker.

**Effort:** M

---

## Accessibility checklist

| Check                                | Status | Notes                                                                      |
| ------------------------------------ | ------ | -------------------------------------------------------------------------- |
| Page `lang` attribute                | PASS   | `<html lang="en">` in layout                                               |
| `<main>` landmark                    | PASS   | Present in AppShell and PageShell                                          |
| `<header>` landmark                  | PASS   | `<header class="tl-header">` in SiteHeader                                 |
| `<nav>` landmark with label          | PASS   | `<nav aria-label="Primary">` in SiteHeader                                 |
| `<footer>` landmark                  | WARN   | Present but empty                                                          |
| Skip link                            | FAIL   | Not implemented                                                            |
| Heading order (AppShell pages)       | FAIL   | No `<h1>` on detail pages; starts at `<h2>`                                |
| Heading order (listing pages)        | PASS   | `<h1>` present via HalfHeroLayout                                          |
| Focus visible (SiteHeader)           | PASS   | `focus-visible` rules on toggle, links                                     |
| Focus visible (SiteNav)              | FAIL   | No focus ring on checkbox-based toggle label                               |
| Focus visible (ScrollArrows)         | PASS   | Explicit `focus-visible` outline at line 178                               |
| Keyboard nav (SiteHeader)            | PASS   | Escape, focus-return, inert implemented                                    |
| Keyboard nav (SiteNav)               | FAIL   | No Escape, no focus trap, no focus-return                                  |
| Keyboard nav (NetworkGraph3D)        | FAIL   | Canvas has no keyboard interaction                                         |
| Alt text                             | PASS   | All images have alt; HalfHeroLayout hero is `alt=""` aria-hidden (correct) |
| Reduced-motion (shader)              | PASS   | `shouldSkipShaders()` checks media query                                   |
| Reduced-motion (NetworkGraph3D)      | FAIL   | Continuous orbit not gated on media query                                  |
| Reduced-motion (nav animations)      | PASS   | Full coverage in SiteHeader, AppShell, ScrollArrows                        |
| Reduced-motion (view transitions)    | PASS   | `1ms` duration in reduced-motion mode                                      |
| ARIA correctness (SiteHeader toggle) | PASS   | `aria-expanded`, `aria-controls`, `aria-label` all correct                 |
| ARIA correctness (nav panel)         | WARN   | `role="dialog" aria-modal="false"` is non-standard                         |
| Noscript fallback (graph)            | PASS   | Full text list of all nodes with links                                     |
| `og:image`                           | PASS   | Present with width, height, alt                                            |
| Canonical URL                        | PASS   | Present on every page                                                      |
| Structured data                      | PASS   | Per-kind Schema.org nodes; breadcrumbs on detail pages                     |
| Sitemap                              | PASS   | Correct `sitemap.xml.ts` with `<link rel="sitemap">`                       |
| Robots.txt                           | PASS   | Correct; advertises sitemap                                                |

---

## Quick wins (ranked)

1. **Add skip link** (S effort, Level A WCAG fix) - single line in `ThinkinglabsUiPage.astro` + `id="main-content"` on `<main>`.
2. **Fix `<h2>` to `<h1>` in DetailHero** (S effort, Level A fix) - one-character change in `DetailHero.astro:34`.
3. **Remove `role="dialog" aria-modal="false"`** from SiteHeader nav panel (S effort, Level A fix) - the `inert` attribute already does the job.
4. **Add `prefers-reduced-motion` check to NetworkGraph3D orbit** (S effort) - four lines at the top of `init()`.
5. **Add focus ring to SiteNav `<label>`** (S effort, Level AA fix) - one CSS rule in `SiteNav.astro`.
6. **Change `<article class="tl-shell">` to `<div>`** (S effort) - removes misleading landmark.
7. **Add `aria-hidden="true"` to empty `<footer>`** or add content (S effort).
8. **Update title strings to remove personal-name copy** (S effort) - three files.

---

## Larger improvements (ranked)

1. **SiteNav keyboard handling parity with SiteHeader** (M effort) - Escape, focus-return, and Tab management for the checkbox-based nav used on detail and listing pages.
2. **NetworkGraph3D keyboard navigation** (L effort) - tabIndex on canvas, arrow-key node cycling, Enter to navigate, live-region node name announcements.
3. **Resolve dual-navigation architecture** (M effort) - SiteHeader vs SiteNav creates split maintenance paths. Unifying on SiteHeader (with its already-correct keyboard handling) or documenting the division clearly reduces long-term a11y drift.
4. **Custom scroll position indicator** (M effort) - replace hidden native scrollbar with a visible non-interactive CSS indicator.

---

## What's already good (keep)

- **EntityShaderSurface client loader** is excellent: checks `prefers-reduced-motion`, `saveData`, and slow connection before loading any React or shader code; uses `IntersectionObserver` with a 2500ms auto-load delay; cleans up on `astro:before-swap`. This is the right pattern for expensive optional enhancements.
- **SiteHeader keyboard handling** is thorough: `AbortController` signal cleanup, `Escape` to close, `pointerdown` outside to close, `focusin`/`focusout` guards with hover probing, `inert` attribute on the closed panel, and proper focus-return on toggle. Excellent example to follow for SiteNav.
- **Noscript graph fallback** renders a complete linked list of all nodes grouped by kind. Uncommon and valuable.
- **Reduced-motion coverage** is comprehensive in CSS: SiteHeader, AppShell, ScrollArrows, EntityConicGradient, PathWordmarkVariant, view-transitions, and the home gallery visual all have `prefers-reduced-motion: reduce` blocks.
- **Astro `Image`/`Picture` convention** is followed everywhere - no raw `<img>` tags in optimizable paths; responsive `widths` and `sizes` are specified; the portrait on About is served as `<picture>` with `avif` and `webp` `<source>` variants scoped to `prefers-color-scheme`.
- **CSS token architecture** in `styles.css` is clean: a single `:root` block for light mode, a `@media (prefers-color-scheme: dark)` override block, and progressive enhancement via `@supports (background: conic-gradient(in oklab, ...))` for better color interpolation where available.
- **JSON-LD structured data** is generated for every route via a well-typed `buildPageGraph()` with per-kind `StructuredData` objects (breadcrumbs on detail pages, `ItemList` on listings, `BlogPosting`/`CreativeWork`/`Statement`/etc. on detail pages).
- **`lang="en"`** on every `<html>` element; canonical, robots, and sitemap are all correct.

---

## Open questions for the maintainer

1. **SiteHeader vs SiteNav**: Are both navigation systems intended to be permanent fixtures, or is the plan to consolidate on one? The answer drives whether SiteNav needs a full keyboard parity pass or can be deprecated.
2. **NetworkGraph3D keyboard**: Is the `/graph` page expected to be accessible to keyboard-only users? If so, what interaction model is preferred (Tab to cycle nodes, arrow keys to orbit, etc.)?
3. **`mix-blend-mode: difference` HUD**: Is the HUD intended to carry meaningful navigational information for all users, or is it a sighted-only design decoration? The answer determines whether `aria-hidden="true"` is appropriate.
4. **`<article class="tl-shell">`**: Is this a deliberate semantic choice (treating the entire page as a self-contained publishable article) or an implementation artifact?
5. **`SiteFooter` content**: The footer element is currently empty in the source. Is content planned? If so, it may need an accessible name once filled.
