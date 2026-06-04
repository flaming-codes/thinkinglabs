# Code Size & Complexity Review - Thinking Labs (2026-06-04)

**Reviewer:** Code Size/Complexity  
**Branch:** feat-design-v2 @ 1e73fd0

---

## Executive Summary

The codebase is healthy at 24,858 LOC across 230 files, with a median file size of 50 lines. The overwhelming majority of files are small and focused. The size concentration is significant: the top-10 files hold 28% of all LOC (6,911 / 24,858). The single biggest structural concern is `thinkinglabs-ui.ts` (1,566 LOC), which functions as a monolithic per-kind data mapper holding 30 exported functions across all 10 content kinds; it is cohesive in purpose but operationally a grab-bag that is hard to navigate and will slow every future kind addition. A secondary concern is the `getCollection` kind-switch idiom being copy-pasted into three separate files (og/png, markdown-routes, sitemap), each reimplementing the same 10-arm dispatch. Elsewhere, most large files are genuinely large due to the domain they cover (CSS in Astro components, shader config data, Schema.org node generation) or fixture data that is inherently verbose.

**Overall complexity health rating: Good / 7 out of 10.** No critical architectural flaws; actionable split opportunities exist in 2-3 files.

**Headline metrics:**

- Total LOC: 24,858 across 230 files
- Median file size: 50 lines
- Files > 300 LOC: 21 (9%)
- Files > 500 LOC: 7 (3%)
- Top-10 files share: 28% of total LOC (6,911 lines)

---

## LOC Inventory (top 30 files)

| File (path from repo root)                                         | LOC   | What it does / size justified?                                                                  |
| ------------------------------------------------------------------ | ----- | ----------------------------------------------------------------------------------------------- |
| `src/lib/thinkinglabs-ui.ts`                                       | 1,566 | Per-kind view mappers for all 10 content kinds. Cohesive purpose, split opportunity.            |
| `src/frontend/thinkinglabs-ui/components/SiteHeader.astro`         | 873   | Nav panel HTML + 170-line JS interaction script + 580-line CSS. All three are essential.        |
| `src/pages/og/[...slug].png.ts`                                    | 716   | Static OG-image route: Satori layout engine, orb/hero renderers, 10-kind dispatch. Justified.   |
| `src/lib/markdown-routes.ts`                                       | 650   | `.md` route builder: Zod envelope schemas + static-page corpus + link resolver. Split possible. |
| `src/frontend/thinkinglabs-ui/mocks/indices.ts`                    | 602   | Fixture data for listing-page previews. Boilerplate-driven; no logic.                           |
| `src/lib/structured-data.ts`                                       | 566   | Schema.org node builders for each kind. Repetitive but unavoidably per-kind.                    |
| `src/frontend/thinkinglabs-ui/types.ts`                            | 540   | All UI view-model interfaces. Pure type declarations; size driven by kind count.                |
| `src/frontend/thinkinglabs-ui/entity-shader-presets.ts`            | 488   | ShaderGradient preset objects for 10 kinds (~43 numeric props each). Config data, not logic.    |
| `src/lib/icon-prototypes/cartographer-minimal.ts`                  | 466   | SVG icon definitions as inline strings plus a 60-item data array. Justified data file.          |
| `src/lib/registry.ts`                                              | 444   | Per-kind registry entries + MCP view specs + helper fns. Dense but coherent.                    |
| `src/frontend/thinkinglabs-ui/components/AppShell.astro`           | 417   | Layout shell: 13-line frontmatter + 50-line script + 335-line global CSS. CSS is the bulk.      |
| `src/frontend/thinkinglabs-ui/pages/AgentsPageComposition.astro`   | 403   | /agents page composition with API surface docs. Mostly template content.                        |
| `src/lib/agents/triage-questions.ts`                               | 379   | LLM agent for triaging open questions. Dense but single responsibility.                         |
| `scripts/derive-claims.ts`                                         | 371   | Interactive CLI for LLM-mediated claim derivation. Single-purpose script.                       |
| `src/pages/icon-prototypes.astro`                                  | 330   | Dev/debug page for icon prototypes. Low priority.                                               |
| `scripts/review-proposals.ts`                                      | 328   | Proposal queue drain CLI with per-agent import. Justified orchestration file.                   |
| `src/frontend/thinkinglabs-ui/components/NetworkGraph3D.client.ts` | 320   | Three.js/Força3D graph renderer. Justified for 3D rendering logic.                              |
| `src/lib/agents/resolve-predictions.ts`                            | 319   | LLM agent resolving outstanding predictions. Single responsibility.                             |
| `src/lib/agents/freshness-review.ts`                               | 315   | LLM agent reviewing post-section freshness. Single responsibility.                              |
| `src/lib/brain-diff.ts`                                            | 308   | Brain-diff feed builder: git diff + per-kind change detection. Coherent.                        |
| `servers/thinkinglabs-mcp/store.ts`                                | 303   | MCP resource store: SQLite primary, markdown fallback. Complex but justified.                   |
| `src/frontend/thinkinglabs-ui/pages/HomePageComposition.astro`     | 293   | Homepage composition. Mostly template + CSS. Acceptable.                                        |
| `servers/thinkinglabs-mcp-http/server.ts`                          | 277   | Stateless HTTP transport with rate limiting, CORS, body cap. Justified.                         |
| `src/lib/review-stale-claims.ts`                                   | 272   | Stale-claims review pipeline. Single responsibility.                                            |
| `servers/thinkinglabs-mcp/handlers.ts`                             | 271   | MCP tool + resource handler implementations. Single responsibility.                             |
| `servers/thinkinglabs-mcp/server.ts`                               | 268   | MCP server factory wiring tools/resources. Justified.                                           |
| `src/lib/surfaces.ts`                                              | 267   | Public surface inventory and feed definitions. Dense registry data.                             |
| `scripts/review-stale-claims.ts`                                   | 256   | CLI wrapper for stale-claims review. Acceptable.                                                |
| `src/frontend/thinkinglabs-ui/components/NetworkGraph3D.astro`     | 230   | Astro wrapper for 3D graph client component. Mostly template.                                   |
| `src/frontend/thinkinglabs-ui/components/ScrollArrows.astro`       | 227   | Scroll-arrows UI: script + CSS. Justified for animation complexity.                             |

---

## Metrics

| Metric                | Value                |
| --------------------- | -------------------- |
| Total LOC             | 24,858               |
| Total files           | 230                  |
| Median file size      | 50 lines             |
| Files > 300 LOC       | 21 (9%)              |
| Files > 500 LOC       | 7 (3%)               |
| Top-10 files % of LOC | 28% (6,911 / 24,858) |

---

## Findings

### [High] `thinkinglabs-ui.ts`: 30-function monolith maps all 10 kinds in one file

**Location:** `src/lib/thinkinglabs-ui.ts` (1–1,566)

**Observation:** The file contains 30 exported functions, one pair (`mapXxxView` / `mapXxxDetail`) per content kind, plus 10 private helpers (markdown parsing, ref resolution, sorting). Every kind's mapper is interleaved in a single 1,566-line file. The largest individual functions are `buildSections` (93 lines, 5 levels of nesting), `inputCitationBacklinks` (54 lines, 4 nested loops), `mapPredictionsView` (76 lines), and `mapCalibrationData` (57 lines). The private utility functions (`buildSections`, `extractFootnotes`, `stripInlineMarkdown`, `markdownParagraphs`) serve only the post mappers but live at the module level, making the file's scope ambiguous.

**Impact:** Adding a new kind requires editing this one file in a random location. Reading or reviewing any mapper requires scrolling past unrelated kind mappers. The post-specific markdown parsing utilities (`buildSections`, `extractFootnotes`, `extractEpigraph`) are buried 375 lines in.

**Recommendation:** Split into three modules:

1. `src/lib/ui-utils.ts` (lines 69–212) - private utilities: `safeDate`, `truncate`, `stripInlineMarkdown`, `inlineToHtml`, `markdownParagraphs`, `wordCount`, `parseRef`, `titleFromLookup`, `titleFromLookupCandidates`, `detailRelation`, `kindLabel`, etc.
2. `src/lib/post-sections.ts` (lines 375–486) - post body parser: `buildSections`, `extractFootnotes`, `extractEpigraph`. These are substantial enough to justify their own module and are post-specific.
3. `src/lib/thinkinglabs-ui.ts` (remaining ~900 lines) - the public mapper API, which can import from the two new modules. Consider per-kind files only if the codebase keeps growing kinds.

**Effort:** M (one PR, mechanical extraction, no logic changes)

---

### [High] `getCollection` kind-switch copy-pasted into three files

**Location:**

- `src/lib/markdown-routes.ts:511–535` (`getPublicKindCollection`)
- `src/pages/og/[...slug].png.ts:471–496` (`getKindCollection`)
- `src/pages/sitemap.xml.ts:55–78` (inline switch)

**Observation:** All three files independently implement a 10-arm `switch(kind)` over `getCollection(kind)`. Each arm does the identical thing (call `getCollection` with a string literal) and covers the same 10 public kinds. The only difference is that the og/png variant includes `"provenance"`. This pattern exists because `getCollection` requires a string literal for Astro's type narrowing, but a shared utility function wrapping the switch would still eliminate two of the three copies.

**Impact:** Adding a new kind requires editing three separate switch blocks in different files. Any mistake in one copy is invisible to the other two.

**Recommendation:** Extract into a shared `src/lib/get-collection-any.ts` exporting `getKindCollection(kind: Kind)` with the 10-arm switch. The three callers import and call it. Accepts a one-time cost to maintain the type-narrowing switch in a single authoritative location.

**Effort:** S (30-minute extraction)

---

### [Medium] `structured-data.ts`: 10 near-identical per-kind builder functions

**Location:** `src/lib/structured-data.ts:135–448`

**Observation:** The file contains 10 exported `<kind>StructuredData` functions. Seven of them follow an identical 4-step template: `canonicalUrl`, `const id = ...`, call `creativeWorkNode` or build a similar node, then `return detailStructuredData(...)`. The `creativeWorkNode` helper already reduces some repetition, but `postStructuredData`, `predictionStructuredData`, `questionStructuredData`, and `claimStructuredData` cannot use it (different Schema.org types) and are copy-pasted verbatim from the same pattern. The total non-data LOC is roughly 80 lines of mechanics repeated 10 times.

**Impact:** Medium. The file is already well-structured with one clear responsibility. The repetition is an onboarding friction and a minor diff surface, not a runtime risk.

**Recommendation:** The existing `creativeWorkNode` approach is the right pattern. The remaining non-`CreativeWork` builders (`postStructuredData`, `predictionStructuredData`, `questionStructuredData`, `claimStructuredData`, `inputStructuredData`, `projectStructuredData`) each have distinct Schema.org types and genuinely different field mappings - their boilerplate is largely irreducible. Consider extracting a `buildDetailStructuredData<T>({ type, id, url, fields, ...breadcrumb })` builder that handles the `canonicalUrl + detailStructuredData` wrapper, reducing each function by 5-8 lines.

**Effort:** S (optional cleanup, low risk)

---

### [Medium] `SiteHeader.astro` (873 LOC): CSS dominates, logic is appropriate for the component

**Location:** `src/frontend/thinkinglabs-ui/components/SiteHeader.astro:290–873`

**Observation:** Of the 873 lines:

- Frontmatter: ~38 lines (navItems array + prop destructure)
- Template: ~75 lines
- Script block: ~170 lines (interaction: hover open/close, focus trap, keyboard handling)
- `<style>`: ~580 lines

The CSS is the size driver. It covers: gradual-blur backdrop stack (5 `span` elements, each with `backdrop-filter` + `mask-image` including `-webkit-` prefixes = ~100 lines), nav panel and rail, per-entity aspect ratios, staggered `animation-delay` for 13 cards (13 hand-enumerated lines at :685-697), reduced-motion overrides, and responsive breakpoints. The JS script is a well-structured event-delegation pattern with `AbortController` lifecycle management.

**Impact:** Low. The CSS is unavoidably verbose for this visual effect. The JS is correct and self-contained. Navigation concerns are legitimately co-located.

**Recommendation:** The 13 staggered `animation-delay` rules (lines 685–697) are mechanical boilerplate that could be eliminated by a `--tl-nav-delay` CSS custom property set in the template (`style="--tl-nav-delay: calc(35ms * var(--index))"`) and resolved via `animation-delay: var(--tl-nav-delay)`. This saves 12 lines and makes the timing formula readable. No other structural split is warranted.

**Effort:** XS (cosmetic cleanup)

---

### [Medium] `entity-shader-presets.ts` (488 LOC): pure config data, no logic risk

**Location:** `src/frontend/thinkinglabs-ui/entity-shader-presets.ts:52–483`

**Observation:** 10 shader preset objects, each with ~43 numeric/string fields. No logic. ~437 lines of pure configuration data. The `EntityShaderGradientPreset` interface (49 lines) could be in a shared types file; the presets themselves are data and belong together. The boilerplate fields (`animate`, `axesHelper`, `bgColor1/2`, `fov`, `frameRate`, `gizmoHelper`, `rangeEnd`, `rangeStart`, `shader`, `destination`, `embedMode`, `format`) have identical values across almost all 10 presets.

**Impact:** Size is not a problem. If the shader library changes its API (adding/removing fields), you must update all 10 objects.

**Recommendation:** Consider extracting a `defaultShaderPreset` base object with the ~15 constant-value fields, then spreading it into each preset (`{ ...defaultShaderPreset, brightness: 1.2, ... }`). This reduces the file by ~150 lines and makes which fields vary per entity immediately apparent. Optional quality-of-life change.

**Effort:** S

---

### [Medium] `markdown-routes.ts` (650 LOC): two separable concerns mixed

**Location:** `src/lib/markdown-routes.ts:1–650`

**Observation:** The file contains two distinct responsibilities:

1. **Contract/schema layer** (lines 1–142): Zod schemas for `markdownDetailEnvelopeSchema`, `markdownListingEnvelopeSchema`, `markdownStaticEnvelopeSchema`, plus the `MARKDOWN_LINK_FIELDS` constant and `LINK_FIELD_TARGETS` map. These are pure contracts used by the render path and by any validator.
2. **Route-building logic** (lines 143–650): `STATIC_MARKDOWN_PAGES` corpus, `buildMarkdownRouteRecords`, `renderDetailMarkdown`, `renderListingMarkdown`, link resolution helpers. This is execution-time logic.

Additionally the file has its own `parseRef` function that duplicates a similar helper in `thinkinglabs-ui.ts`.

**Impact:** Medium. The contracts (`markdownDetailEnvelopeSchema`) are imported by `check-structured-data.ts` and other scripts; splitting would clean up the dependency graph.

**Recommendation:** Extract lines 1–142 into `src/lib/markdown-route-schemas.ts`. The route builders and static corpus stay in `markdown-routes.ts`. This gives scripts that only need the contracts a lighter import. Investigate whether the `parseRef` in this file and `parseRef` in `thinkinglabs-ui.ts` can be unified in `src/lib/refs.ts`.

**Effort:** S

---

### [Low] `AppShell.astro` (417 LOC): global utility CSS inflates size

**Location:** `src/frontend/thinkinglabs-ui/components/AppShell.astro:84–417`

**Observation:** AppShell hosts ~335 lines of CSS that include global utility classes for typography, layout, and component variants (`.tl-page-head`, `.tl-index-list`, `.tl-kind-row`, `.tl-thought-row`, etc.) using Astro's `:global()`. The frontmatter is 12 lines and the script is ~50 lines (scroll-position tracker). The CSS here is effectively a global stylesheet but scoped to `.tl-shell`; this is an architectural decision (colocation) rather than a mistake.

**Impact:** Low. No functional issue. The global CSS being inside AppShell rather than a standalone `.css` file makes it less discoverable, but colocation has been the established pattern.

**Recommendation:** No structural change needed. If a global style sheet is ever introduced, AppShell's CSS would be a natural migration target.

**Effort:** N/A (accept as-is)

---

### [Low] `registry.ts` (444 LOC): boilerplate-dense but authoritative

**Location:** `src/lib/registry.ts:51–233`

**Observation:** The `KIND_REGISTRY` object (lines 51–233) contains 11 kind entries, each with 10–14 string fields. Most fields follow a predictable pattern (e.g., every kind has `apiTitle: "<Kind> JSON"` and `apiDescription: "All <kinds> as JSON."`). The registry is the correct single source of truth, but ~50% of its lines are repetitive field values that could be derived. The `PUBLIC_VIEWS` array (lines 291–436) adds another 145 lines of view specs.

**Impact:** Very low. Well-structured, easy to read. Future-kind additions require ~15 new lines here.

**Recommendation:** Optionally derive `apiTitle` and `apiDescription` from `listingTitle` rather than hardcoding them. Minor cleanup only.

**Effort:** XS

---

### [Low] Mock files (`mocks/indices.ts` 602 LOC, total mocks 1,372 LOC)

**Location:** `src/frontend/thinkinglabs-ui/mocks/`

**Observation:** 1,372 lines of fixture data split across 6 files. No logic. Pure JSON-like objects representing listing/detail view models for Storybook (note: Storybook has been removed from the branch per git status). If these mocks are now only used by unit tests, their volume is normal.

**Impact:** Very low. Data files are not a complexity concern. Worth auditing whether they are still referenced after Storybook removal.

**Effort:** XS audit

---

### [Info] `buildSections` (93 lines, 5-level nesting): highest-complexity single function

**Location:** `src/lib/thinkinglabs-ui.ts:375–468`

**Observation:** `buildSections` is the single most complex function in the codebase: nested function definition (`pushCurrent` at line 381), a `for` loop over lines, an inner `if/match` branch, then a second loop over `rawBlocks` with 4 mutually-exclusive type-dispatch branches (`pull`, `fig`, `list`, `p`), each 8–12 lines, plus a `markedDrop` stateful flag. McCabe cyclomatic complexity is approximately 14. This is genuinely complex because it implements a mini Markdown-to-block-list parser.

**Impact:** Low at runtime. High cognitive load for anyone modifying post rendering behavior. The function is tested indirectly by `mapPostDetail` tests.

**Recommendation:** If the post section format stabilizes, consider extracting `buildSections` into `src/lib/post-sections.ts` (see the `thinkinglabs-ui.ts` split recommendation above) and adding dedicated unit tests for each block type. No urgent action needed.

**Effort:** S (when splitting thinkinglabs-ui.ts)

---

## Quick Wins (ranked)

1. **Extract `getKindCollection` switch into a shared util** (`src/lib/get-collection-any.ts`) - eliminates 3-site copy-paste, S effort, immediate payoff for future kind additions.
2. **Extract `defaultShaderPreset` base object** in `entity-shader-presets.ts` - saves ~150 lines, makes per-kind variation instantly visible, S effort.
3. **Extract markdown-route Zod schemas** into `src/lib/markdown-route-schemas.ts` - cleaner dependency graph for validator scripts, S effort.
4. **Staggered animation delays to CSS custom property** in `SiteHeader.astro` - saves 12 lines, makes timing formula readable, XS effort.
5. **Derive `apiTitle`/`apiDescription` in `registry.ts`** from `listingTitle` - removes ~20 redundant strings, XS effort.

---

## Larger Refactors (ranked)

1. **Split `thinkinglabs-ui.ts`** into `ui-utils.ts` + `post-sections.ts` + the public mapper file - highest ROI for developer ergonomics. 30 public functions in one file will grow with every new kind; split now while it is 1,566 lines, not 2,500. M effort, 1 PR.
2. **Audit stale mock usage after Storybook removal** - 1,372 lines of fixture data may be dead weight. Check if mocks are still imported anywhere; if only by tests, rename/relocate accordingly. S effort.
3. **Unify the two `parseRef` implementations** (`thinkinglabs-ui.ts:157` and `markdown-routes.ts:604`) into `src/lib/refs.ts` - prevents semantic drift between the two reference-resolution paths. M effort.

---

## What's Already Good (keep)

- **Median file size of 50 lines** - the vast majority of the codebase is well-proportioned. Page API endpoints (`src/pages/api/*.json.ts`) are correctly 4 lines each.
- **`registry.ts` as the single source of truth** - all downstream surfaces (site, MCP, CLIs, JSON feeds) branch from one authoritative file rather than scattering kind logic across the codebase.
- **`structured-data.ts` using `creativeWorkNode` helper** - already well-factored; the builder pattern reduces per-kind boilerplate effectively.
- **Astro composition pages are appropriately sized** - the 18 `*PageComposition.astro` files average ~140 lines each, reflecting the template-heavy nature of Astro pages without ballooning into logic holders.
- **`SiteHeader.astro` JS interaction block** - correctly uses `AbortController` + `astro:page-load` lifecycle, is cleanly structured, and co-locates interaction logic with the component it controls.
- **Agent modules** (`triage-questions`, `resolve-predictions`, `freshness-review`) are 315–379 lines, each with a single clearly-stated responsibility, consistent with the ADR-008 agent pattern.
- **MCP server split into factory + transports** is architecturally clean; `servers/thinkinglabs-mcp/server.ts` at 268 lines is appropriately sized for a server factory.
