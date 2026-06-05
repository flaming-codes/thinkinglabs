# Unused / Dead Code Review - Thinking Labs (2026-06-04)

**Reviewer:** Unused/Dead Code · **Branch:** feat-design-v2 @ 1e73fd0

---

## Executive summary

The codebase is in solid shape for active pipeline and server code - every agent, server, script, and library module is reachable from at least one entry point. The dead weight lives almost entirely in the `src/frontend/thinkinglabs-ui/` design layer: six page-composition components and five UI components lost their importers during the v2 redesign, three npm dependencies have no import sites in the source tree, and the mock data layer grew to ~1,400 lines while only one export (`BRAIN_DIFF`) is actually consumed at runtime. No security-critical dead code was found. Estimated removable lines: ~3,000–3,400 LOC across source files, plus three empty/stub public directories. Overall health rating: **B+ (good core, cluttered design layer)**.

---

## Method

Static grep only - no build execution. For each candidate:

1. Searched the entire repo (`src/`, `scripts/`, `servers/`, `tests/`, `embeds/`, `astro.config.mjs`, `package.json`, `.harness/`) for the file name, export name, and import path using `grep -rn --include="*.ts" --include="*.tsx" --include="*.astro"`.
2. Accounted for dynamic imports (`import("./...")`), Astro glob patterns (`import.meta.glob`), string-based references (heroSlug, surface URLs), and test-only usage.
3. Checked `mocks/index.ts` re-exports to confirm whether the barrel was imported elsewhere.
4. Cross-referenced `package.json` deps against direct import sites; noted peerDep/devDep relationships for implicit build-tool deps.

---

## Findings

### [High] Orphaned page composition: `HomePageComposition.astro`

- **Location:** `src/frontend/thinkinglabs-ui/pages/HomePageComposition.astro`
- **What's unused:** The full 293-line home page composition. `src/pages/index.astro` is hand-rolled directly and never imports this component.
- **Verification:** `grep -rn "HomePageComposition" src/` - zero results outside the component file itself.
- **Confidence:** High
- **Recommendation:** Delete. If a home redesign reuses this layout, recreate from the active `index.astro`.
- **Effort:** S

---

### [High] Orphaned page composition: `InputDetailPageComposition.astro`

- **Location:** `src/frontend/thinkinglabs-ui/pages/InputDetailPageComposition.astro` (177 lines)
- **What's unused:** The full input detail page. `src/pages/inputs/[...slug].astro` imports `InputDetailMinimalPageComposition` instead.
- **Verification:** `grep -rn "InputDetailPageComposition" src/pages/` - zero results.
- **Confidence:** High
- **Recommendation:** Delete. The "Minimal" variant is canonical; this is a superseded draft.
- **Effort:** S

---

### [High] Orphaned UI component cluster: `EntityShaderSurface` + 3 satellite components

- **Location:**
  - `src/frontend/thinkinglabs-ui/components/EntityShaderSurface.astro` (89 lines)
  - `src/frontend/thinkinglabs-ui/components/EntityShaderSurface.client.ts` (134 lines)
  - `src/frontend/thinkinglabs-ui/components/IndexHero.astro` (61 lines)
  - `src/frontend/thinkinglabs-ui/components/StatBand.astro` (54 lines)
  - `src/frontend/thinkinglabs-ui/components/DotLabel.astro` (25 lines)
- **What's unused:** `EntityShaderSurface.astro` is never imported by any page or composition (the shader gradient is mounted differently in the current v2 design). `IndexHero`, `StatBand`, and `DotLabel` have no importers anywhere.
- **Verification:**
  - `grep -rn "EntityShaderSurface" src/ --include="*.astro" --include="*.ts"` - only the self-referencing import inside `EntityShaderSurface.astro:28`.
  - `grep -rn "IndexHero\|StatBand\|DotLabel" src/ --include="*.astro" --include="*.ts"` - zero results outside their own files.
- **Confidence:** High
- **Recommendation:** Delete all five files. `EntityShaderGradient.ts` and `entity-shader-presets.ts` are still live (used by `EntityShaderSurface.client.ts`) - but since `EntityShaderSurface.client.ts` is itself orphaned, the entire shader pipeline from surface inward needs tracing before final removal.
- **Effort:** M (verify shader pipeline is reachable through another path before deleting)

---

### [High] Orphaned UI component: `IndexSectionHeader.astro`

- **Location:** `src/frontend/thinkinglabs-ui/components/IndexSectionHeader.astro` (46 lines)
- **What's unused:** Only used by the orphaned `InputDetailPageComposition.astro`.
- **Verification:** `grep -rn "IndexSectionHeader" src/ --include="*.astro"` - two files: the component itself and the orphaned composition.
- **Confidence:** High
- **Recommendation:** Delete alongside `InputDetailPageComposition.astro`.
- **Effort:** S

---

### [High] Orphaned UI component: `EntityConicGradient.astro`

- **Location:** `src/frontend/thinkinglabs-ui/components/EntityConicGradient.astro` (60 lines)
- **What's unused:** Only used by the orphaned `InputDetailPageComposition.astro`.
- **Verification:** `grep -rn "EntityConicGradient" src/ --include="*.astro" --include="*.ts"` - two files: the component itself and the orphaned composition.
- **Confidence:** High
- **Recommendation:** Delete alongside `InputDetailPageComposition.astro`.
- **Effort:** S

---

### [High] Orphaned source component: `EmbeddedTool.astro`

- **Location:** `src/components/EmbeddedTool.astro` (199 lines)
- **What's unused:** `EmbeddedTool.astro` is never imported by any page or composition. `CalibrationPageComposition.astro` inlines its own embed implementation directly; the `embeds/` API route does not import this component.
- **Verification:** `grep -rn "import.*EmbeddedTool" src/ --include="*.astro" --include="*.ts"` - only the self-import of `embeds/core.ts` types within the component.
- **Confidence:** High
- **Recommendation:** Delete. The embed behaviour is fully implemented inline in `CalibrationPageComposition.astro`. File can be removed immediately; tests reference `embeds/index.ts` directly and are unaffected.
- **Effort:** S

---

### [Medium] Mock data barrel exported but never consumed: `mocks/indices.ts` (602 lines)

- **Location:** `src/frontend/thinkinglabs-ui/mocks/indices.ts`
- **What's unused:** All seven named exports (`PROJECTS_VIEW`, `PREDICTIONS_VIEW`, `CHANGED_MY_MIND_VIEW`, `DECISIONS_VIEW`, `QUESTIONS_VIEW`, `INPUTS_VIEW`, `INPUT_DETAIL`) are re-exported via `mocks/index.ts` but never imported by any page, test, or server file.
- **Verification:** `grep -rn "PROJECTS_VIEW\|PREDICTIONS_VIEW\|CHANGED_MY_MIND_VIEW\|DECISIONS_VIEW\|QUESTIONS_VIEW\|INPUTS_VIEW\|INPUT_DETAIL" src/ scripts/ tests/` - zero results outside the mock files themselves.
- **Confidence:** High
- **Recommendation:** Delete the file and remove its re-export from `mocks/index.ts`. These were scaffolding data for the now-removed Storybook.
- **Effort:** S

---

### [Medium] Mock data never consumed: `mocks/claims.ts`, `mocks/posts.ts`, `mocks/thoughts.ts`, `mocks/home.ts`

- **Location:** `src/frontend/thinkinglabs-ui/mocks/` (172, 176, 176, 69 lines respectively)
- **What's unused:** Exports `CLAIMS`, `FEATURED_CLAIM_DETAIL`, `POST_DETAIL`, `POSTS`, `ABOUT_KINDS`, `THOUGHT_DETAIL`, `THOUGHTS`, `KINDS` are re-exported from `mocks/index.ts` but imported nowhere.
- **Verification:** `grep -rn "CLAIMS\|FEATURED_CLAIM_DETAIL\|POST_DETAIL\b\|POSTS\b\|ABOUT_KINDS\|THOUGHT_DETAIL\|THOUGHTS\b" src/ tests/ scripts/` - zero results outside mock files.
- **Confidence:** High
- **Recommendation:** Delete all four files, their re-exports in `mocks/index.ts`, and thereafter `mocks/index.ts` itself (it would have no remaining exports).
- **Effort:** S

---

### [Medium] Partially dead mock file: `mocks/extras.ts`

- **Location:** `src/frontend/thinkinglabs-ui/mocks/extras.ts` (171 lines)
- **What's unused:** `NOW` and `CALIBRATION` are exported but never imported. Only `BRAIN_DIFF` is consumed (`src/pages/brain-diff.astro`).
- **Verification:** `grep -rn "NOW\b\|CALIBRATION\b" src/pages/ src/frontend/` - zero results outside the mock files.
- **Confidence:** High
- **Recommendation:** Remove the `NOW` and `CALIBRATION` constants and their exports. Retain the file and `BRAIN_DIFF` as-is, or inline `BRAIN_DIFF` directly in `brain-diff.astro`.
- **Effort:** S

---

### [Medium] Unexported function `mapHomeKinds` used only in tests

- **Location:** `src/lib/thinkinglabs-ui.ts:511`
- **What's unused:** `mapHomeKinds` is exported but never imported in any `src/pages/` or `src/frontend/` file. It is only called in `tests/thinkinglabs-ui-routes.test.ts`.
- **Verification:** `grep -rn "mapHomeKinds" src/` - definition only. `grep -rn "mapHomeKinds" tests/` - one test file.
- **Confidence:** High
- **Recommendation:** Keep (it backs a meaningful test). This is not dead code - it is test-only surface. Consider marking with a `/** @internal */` JSDoc comment to signal intent.
- **Effort:** S (annotation only)

---

### [Medium] Orphan library file: `src/lib/backlinks.ts` (unused export)

- **Location:** `src/lib/backlinks.ts` (11 lines)
- **What's unused:** The file exports only `addClaimBacklink`. It is correctly imported by `scripts/derive-claims.ts`, so it is not truly dead - but it contains no other exports and is a very thin wrapper.
- **Verification:** `grep -rn "addClaimBacklink\|from.*backlinks" src/ scripts/` - used in `scripts/derive-claims.ts:6`.
- **Confidence:** High (used; not dead)
- **Recommendation:** No action needed. Note for future: could be inlined into `derive-claims.ts`.
- **Effort:** S

---

### [Medium] Prototype page `icon-prototypes.astro` + `src/lib/icon-prototypes/` cluster (496 lines)

- **Location:**
  - `src/pages/icon-prototypes.astro` (330 lines) - published at `/icon-prototypes`, `robots="noindex"`
  - `src/lib/icon-prototypes/cartographer-minimal.ts` (466 lines)
  - `src/lib/icon-prototypes/index.ts` (21 lines)
  - `src/lib/icon-prototypes/types.ts` (10 lines)
- **What's unused:** Outside the page and its own lib, nothing else imports these files. The page is noindexed and carries no nav entry.
- **Verification:** `grep -rn "icon-prototypes\|iconPrototype\|cartographerMinimal" src/ scripts/ servers/` - only the page and its lib.
- **Confidence:** High
- **Recommendation:** Delete the entire cluster if icon prototyping is complete. The `noindex` flag signals it was always intended as ephemeral.
- **Effort:** S

---

### [Low] `removeStaleOgImageVariants` exported but only called internally

- **Location:** `src/lib/og-image-cache.ts:72`
- **What's unused:** `removeStaleOgImageVariants` is exported but only called by `writeOgImageCache` within the same file. No external caller.
- **Verification:** `grep -rn "removeStaleOgImageVariants" src/ scripts/ servers/` - two hits, both inside `og-image-cache.ts`.
- **Confidence:** Medium (could be intentional for future callers or the `clean:og-cache` script)
- **Recommendation:** Make the function unexported (`function removeStaleOgImageVariants`). Low priority.
- **Effort:** S

---

### [Low] Empty directory: `public/experiments/thoughts-drop/`

- **Location:** `public/experiments/thoughts-drop/` (empty - `ls -la` shows only `.` and `..`)
- **What's unused:** No files; no references anywhere in the codebase.
- **Verification:** `find public/experiments/thoughts-drop -type f` - no output. `grep -rn "thoughts-drop\|experiments/"` - zero source references.
- **Confidence:** High
- **Recommendation:** Delete the directory. It is a leftover experiment stub.
- **Effort:** S

---

### [Info] `brain-diff.astro` uses hardcoded mock data in production

- **Location:** `src/pages/brain-diff.astro:2`
- **What's notable:** The page imports `BRAIN_DIFF` from the mock layer (`mocks/extras.ts`) and renders it as if it were real data. This is not dead code but it is mock-in-prod: the page ships static fixture data rather than live brain-diff output.
- **Verification:** `src/pages/brain-diff.astro` - no real data fetch, only `import { BRAIN_DIFF } from "../frontend/thinkinglabs-ui/mocks/extras.ts"`.
- **Confidence:** High
- **Recommendation:** Flag for product decision: either connect to the real brain-diff feed or mark the page as `robots="noindex"` / remove it.
- **Effort:** M

---

## Unused dependencies

| Package                      | Import sites found      | Notes                                                                                                                          | Verdict                |
| ---------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `@react-three/fiber`         | 0 direct imports        | `@shadergradient/react` bundles r3f internally (confirmed via dist). Direct dep in package.json is redundant.                  | **Remove**             |
| `three-stdlib`               | 0 imports               | `NetworkGraph3D.client.ts` uses `three/examples/jsm/controls/OrbitControls.js` from `three` directly, not from `three-stdlib`. | **Remove**             |
| `camera-controls`            | 0 imports               | No import site found anywhere in `src/`, `scripts/`, `servers/`.                                                               | **Remove**             |
| `@vite-pwa/assets-generator` | 0 imports or scripts    | No `pwa-assets.config.*` file; no script entry calls this. PWA icons exist in `public/` (presumably pre-generated).            | **Verify then remove** |
| `node-gyp`                   | 0 direct imports        | Transitive build dep for `better-sqlite3` native module. Listing it as an explicit devDependency is intentional for DO builds. | **Keep (build infra)** |
| `remark-parse`               | 1 import                | `src/lib/section-stamps.ts:2` - used.                                                                                          | Keep                   |
| `unified`                    | 2 imports               | `src/lib/section-stamps.ts` and `astro.config.mjs` - both used.                                                                | Keep                   |
| `schema-dts`                 | 2 imports               | `src/components/JsonLd.astro`, `src/lib/structured-data.ts` - used.                                                            | Keep                   |
| `@astrojs/markdown-remark`   | 1 import                | `astro.config.mjs:4` - used for `unified` re-export.                                                                           | Keep                   |
| `@types/hast`                | Ambient via `.ts` files | `src/markdown/rehype-section-freshness.ts:1` imports `Element`, `Root` from `hast`.                                            | Keep                   |
| `@types/mdast`               | Ambient via `.ts` files | `src/markdown/remark-section-freshness.ts:1` imports from `mdast`.                                                             | Keep                   |

---

## Orphaned assets

| Asset                                                    | Referenced by                                                                                | Verdict |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------- |
| `public/experiments/thoughts-drop/` (empty dir)          | Nothing                                                                                      | Delete  |
| `src/assets/now-hero.png`                                | `HalfHeroLayout.astro` via `import.meta.glob("../../../assets/*.png")` with `heroSlug="now"` | In use  |
| All other `src/assets/*.png/jpeg`                        | Imported directly or via glob                                                                | In use  |
| `public/shadergradient/hdr/*.hdr`                        | `EntityShaderGradient.ts:18` via `envBasePath: "/shadergradient/hdr/"`                       | In use  |
| `public/screenshots/desktop-home.png`, `mobile-home.png` | `public/manifest.webmanifest`                                                                | In use  |

---

## Quick wins (ranked - safe deletions)

1. **Delete `mocks/indices.ts`** - 602 lines, zero callsites, pure dead weight. Grep: `grep -rn "PROJECTS_VIEW\|DECISIONS_VIEW\|INPUTS_VIEW"` → definition only.
2. **Delete `EmbeddedTool.astro`** - 199 lines, never imported, functionality inlined elsewhere.
3. **Delete `HomePageComposition.astro`** - 293 lines, zero importers.
4. **Delete `InputDetailPageComposition.astro` + `IndexSectionHeader.astro` + `EntityConicGradient.astro`** - 283 lines total, all orphaned together.
5. **Delete `mocks/claims.ts`, `mocks/posts.ts`, `mocks/thoughts.ts`, `mocks/home.ts`** - 593 lines total, zero consumers outside mock barrel.
6. **Remove `NOW` and `CALIBRATION` from `mocks/extras.ts`** - ~90 lines; `BRAIN_DIFF` stays.
7. **Remove `camera-controls`, `three-stdlib`, `@react-three/fiber` from `package.json`** - zero import sites.
8. **Delete `public/experiments/thoughts-drop/`** - empty directory.
9. **Delete icon-prototypes cluster** (`src/lib/icon-prototypes/` + `src/pages/icon-prototypes.astro`) - 827 lines if the prototype is complete.
10. **Delete `EntityShaderSurface.astro` + `EntityShaderSurface.client.ts` + `IndexHero.astro` + `StatBand.astro` + `DotLabel.astro`** - 363 lines; verify shader gradient pipeline entrypoint first.

Estimated removable LOC from items 1–9: ~3,100 lines. Item 10 adds ~360 more, pending shader pipeline verification.

---

## Needs-confirmation (low-confidence items to ask maintainer)

1. **`@vite-pwa/assets-generator`**: No `pwa-assets.config.*` file was found. Is this run manually outside the repo (e.g., a one-shot npm exec) to regenerate icons in `public/`, or is it genuinely unused? If the latter, remove it.
2. **`EntityShaderSurface.astro` + client**: The component has no importers, but `EntityShaderGradient.ts` and `entity-shader-presets.ts` are referenced by it. If the shader gradient feature is intended for future use, the cluster is a WIP stub; if it was removed from the design system, delete the whole chain (`EntityShaderSurface.astro`, `EntityShaderSurface.client.ts`, `EntityShaderGradient.ts`, `entity-shader-presets.ts`).
3. **`brain-diff.astro` mock data**: Is the page intentionally shipping mock/fixture data for now, or was it accidentally left disconnected from the real brain-diff pipeline?
4. **`graph.astro` route**: The 3D network graph page is indexed in `surfaces.ts` and fully functional. It is not dead code, but it has no nav entry. Was it deliberately hidden, or is it awaiting a nav link?

---

## What's confirmed in-use (notable candidates that turned out used)

- **`src/lib/icon-prototypes/`**: Used by `src/pages/icon-prototypes.astro`. Whole cluster is live - flagged as "prototype page" above, not as orphan.
- **`entity-shader-presets.ts`**: Used by `EntityShaderGradient.ts` and `EntityShaderSurface.astro` (but both those callers may be orphaned - see above).
- **`src/lib/backlinks.ts`**: Used by `scripts/derive-claims.ts`.
- **`src/lib/network-graph.ts` / `network-graph-layout.ts`**: Used by `src/pages/graph.astro` which is live.
- **`src/frontend/thinkinglabs-ui/lib/horizontal-wheel-scroll.ts`**: Used by `ScrollArrows.astro`, which is used by `SiteHeader.astro` and `HomePageComposition` - the latter is orphaned, but `SiteHeader` keeps this live.
- **`mocks/extras.ts` (`BRAIN_DIFF`)**: Used in `brain-diff.astro`.
- **All five agent modules** (`dormant-flip.ts`, `freshness-review.ts`, etc.): Used by their CLIs in `scripts/` and by `scripts/review-proposals.ts`.
- **`src/lib/og-image-cache.ts`**: Fully used by `src/pages/og/[...slug].png.ts`.
- **`@shadergradient/react`**: Used by `EntityShaderGradient.ts`.
- **`d3-force-3d`**: Used by `src/lib/network-graph-layout.ts`.
- **`embeds/` system**: `embeds/index.ts`, `embeds/core.ts`, `prediction-calibration-logger/` - all live via `src/pages/api/embed/[id].json.ts` and `CalibrationPageComposition.astro`.
