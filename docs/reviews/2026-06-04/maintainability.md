# Maintainability & Architecture Review - Thinking Labs (2026-06-04)

**Reviewer:** Maintainability/Architecture · **Branch:** feat-design-v2 @ 1e73fd0

## Executive summary

The core architecture is in genuinely good shape and has visibly improved since the 2026-05-02 review: the previously-flagged P1 ("centralize public kind and surface metadata") is fully resolved by `src/lib/registry.ts`, a single typed registry with compile-time coverage assertions that now drives content collections, the index builder, the MCP server, sitemaps, OG images, and `surfaces.ts`. The source-vs-index invariant (ADR-001), the schema registry (ADR-002), the MCP factory/transport split (ADR-010/013), and the proposal/confirmation pattern (ADR-008/009) are all implemented as their ADRs describe, with no meaningful architectural drift in the backend. The data flow (source markdown → Zod → index/collections → lib view-model mappers → typed frontend compositions) is coherent and one-directional.

The maintainability debt is concentrated in the **frontend/redesign layer** introduced on this branch: a 1,566-LOC `src/lib/thinkinglabs-ui.ts` view-model god-module, a stale `docs/conventions/components.md` describing four "primitives" of which three were deleted, roughly 1,400 LOC of hand-authored mock fixtures (one of which is rendered as live production content on `/brain-diff`), and at least eight orphaned frontend components/compositions left behind by the redesign. None of this threatens correctness, but it raises cognitive load and creates traps for the next maintainer.

**Overall maintainability health: GOOD (B+).** Backend/architecture is A-grade; the new UI layer is the drag and is fixable with mostly-mechanical cleanup.

## Scope & method

Read-only review. Method: `git`/`grep`/`wc` + targeted `Read` of the ADR-relevant files. Read ADR index and the registry/schema/MCP/proposal source. Mapped the `src/lib/` internal import graph, the `src/components/` vs `src/frontend/thinkinglabs-ui/` split, every page-composition's layout dependency, and the "add a kind" touchpoint set. Verified orphan candidates with whole-tree import searches to avoid false positives. Did **not** run builds, tests, or e2e (per instructions).

## Architecture map

**Clean spine (keep as-is):**

- `src/schemas/kinds.ts` → `KINDS` literal tuple is the single kind enumeration.
- `src/schemas/index.ts` → `KIND_SCHEMAS` binds schema + link-field metadata per kind; `satisfies Record<Kind, KindSpec>`.
- `src/lib/registry.ts` → `KIND_REGISTRY` + `PUBLIC_VIEWS` + `DETAIL_KINDS`/`LISTING_KINDS`, with three compile-time coverage assertions (`registry.ts:439-441`, `content.config.ts:54-58`). This is the architectural keystone.
- Consumers derive from the registry rather than re-listing kinds: `src/index/builder.ts:136`, `src/pages/sitemap.xml.ts:31-38`, `src/pages/og/[...slug].png.ts:350-374`, `src/lib/surfaces.ts`, `servers/thinkinglabs-mcp/server.ts:17,25-30`.
- MCP: one factory `createThinkinglabsMcpServer` (`servers/thinkinglabs-mcp/server.ts:33`) reused by both transports (`servers/thinkinglabs-mcp-http/server.ts:178`). Transport-specific concerns (rate-limit, CORS) live only in the HTTP server. Exactly as ADR-010/013 prescribe.
- Env seam: `src/lib/env.ts` is a Zod-validated, cached `process.env` parse; **zero** direct `process.env.*` reads leak outside it across `src/`, `servers/`, `scripts/` - except the LLM module (see finding M4).
- JSON API handlers are 4 lines each via `collectionJson(kind)` (`src/pages/api/*.json.ts`, `src/lib/api.ts`) - exemplary.

**Tangled / drifting (the findings below):**

- `src/lib/thinkinglabs-ui.ts` (1,566 LOC) - per-kind view-model mappers all in one file.
- Two component homes (`src/components/` 4 files vs `src/frontend/thinkinglabs-ui/components/` 30+ files) with no documented rule for which is which; the documented rule is stale.
- Redesign leftovers: orphaned compositions/components, a mock-data dir wired into a production route, a prototype route shipped to production.
- Per-kind hand-maintained code outside the registry: 11 near-identical `*StructuredData` functions, per-detail-page manual structured-data wiring, and several per-kind `Record<...>` maps in the OG route.

## Findings

### [Medium] `src/lib/thinkinglabs-ui.ts` is a 1,566-LOC view-model god-module

**Location:** `src/lib/thinkinglabs-ui.ts` (whole file; 30 exported `map*` functions, e.g. `mapClaimDetail` :592, `mapThoughtDetail` :719, `mapPredictionsView` :1100, `mapInputDetail` :1468).
**Observation:** The file is the single home for every kind's listing/detail/summary view-model mapping plus shared text helpers (`truncate` :76, `stripInlineMarkdown` :82, `inlineToHtml` :106) plus backlink/citation derivation (`predictionEvidenceBacklinks` :227, `inputCitationBacklinks` :266). It's the most-imported internal lib module (6 importers) and the largest file in the repo. Every detail/listing page imports one function from it, so the whole module is in every page's dependency graph.
**Impact:** High cognitive load to navigate; merge-conflict hotspot during the active redesign; "add a kind" means editing this monolith; no natural boundary signals which helpers are shared vs kind-local. Not a correctness risk - the functions are pure and well-typed - purely a navigability/scaling concern.
**Recommendation:** Split along the seams that already exist. (1) Extract the shared text utilities (`truncate`, `stripInlineMarkdown`, `escapeHtml`, `inlineToHtml`, `safeDate`, reading-time) into `src/lib/view-text.ts`. (2) Move the per-kind mappers into `src/lib/view-models/<kind>.ts` (one file per kind) re-exported through a barrel, mirroring the per-kind split already used in `src/schemas/`. (3) Keep `buildTitleLookup`/`buildClaimLookup` in a small shared `view-lookups.ts`. The frontend `types.ts` already defines the contract, so this is mechanical.
**Effort:** M

### [Medium] Stale convention doc: three of four documented "shared primitives" no longer exist

**Location:** `docs/conventions/components.md:3-10`.
**Observation:** The doc names `StatusPill.astro`, `MetaBlock.astro`, `Tags.astro`, `EmptyState.astro` as "the four primitives in `src/components/` [that] cover almost every per-kind rendering need." Three were deleted in the redesign - `grep` for `StatusPill`/`MetaBlock` across `src/` returns nothing, and `Tags` is gone. `src/components/` now holds `EmbeddedTool`, `EmptyState`, `JsonLd`, `PwaHead` (a different set). The doc's central guidance ("reach for them before introducing kind-specific markup") points at things that don't exist.
**Impact:** A new maintainer following the convention doc will look for components that aren't there and won't discover the real component home (`src/frontend/thinkinglabs-ui/components/`). The doc is the primary onboarding artifact for the UI layer and is actively misleading.
**Recommendation:** Rewrite `components.md` to describe the actual two-tier layout system (`Entity*` / `Detail*` / `*PageComposition` in `src/frontend/thinkinglabs-ui/`) and the real role of `src/components/` (head/meta/embed helpers). Document the rule for which home a new component belongs in (see finding M3).
**Effort:** S

### [Low] `EmptyState.astro` is dead code; component-home boundary is undocumented

**Location:** `src/components/EmptyState.astro` (zero importers - `grep` for `EmptyState` across `src/` matches only its own file); `src/components/` vs `src/frontend/thinkinglabs-ui/components/`.
**Observation:** `EmptyState` survived the redesign in `src/components/` but is no longer imported anywhere; listings now use inline empty states (e.g. `EntityIndexPageComposition.astro:78` "Nothing filed here yet."). More broadly, there are now two component directories with no stated boundary: `src/components/` (4 files: `EmbeddedTool`, `JsonLd`, `PwaHead`, dead `EmptyState`) and `src/frontend/thinkinglabs-ui/components/` (30+ files). The de-facto rule appears to be "head/SEO/embed helpers live in `src/components/`, visual UI lives in `src/frontend/thinkinglabs-ui/`," but nothing records this.
**Impact:** Dead file; ambiguity about where a new component goes; the empty-state UX has silently fragmented back into per-page inline markup (the exact thing the deleted `EmptyState` existed to prevent).
**Recommendation:** Delete `EmptyState.astro`. Document the `src/components/` vs `thinkinglabs-ui/components/` boundary in `components.md`. Consider a shared empty-state component in the UI layer if uniform empty rendering is still desired.
**Effort:** S

### [Medium] Mock fixture data is rendered as live production content on `/brain-diff`

**Location:** `src/pages/brain-diff.astro:2,11` → `import { BRAIN_DIFF } from "../frontend/thinkinglabs-ui/mocks/extras.ts"`; `<BrainDiffPageComposition days={BRAIN_DIFF} />`.
**Observation:** The public `/brain-diff` HTML page renders hardcoded mock data from the design-system `mocks/` directory rather than the real brain-diff artifact. The real feed surfaces exist and are advertised in `surfaces.ts` (`/feed/brain-diff.xml`, `/feed/brain-diff.json`, `src/lib/surfaces.ts:133-148`) and are produced by `pnpm brain-diff` / `pnpm artifacts`. The HTML page is simply not wired to them. `mocks/` is otherwise a UI-only fixtures dir (1,372 LOC across `mocks/*.ts`), and this is its only production importer.
**Impact:** The page shows fabricated entries to real visitors; it will not reflect actual content changes; and it couples a production route to a directory that is conceptually "design fixtures." This is a data-integrity smell, not just a style one.
**Recommendation:** Wire `/brain-diff` to the generated feed artifact (read the JSON feed at build time, same source the `/feed/*` surfaces use) and remove the `mocks/extras.ts` import. If the real feed can be empty in dev, render an explicit empty state rather than fixtures.
**Effort:** M

### [Low] Eight orphaned frontend components/compositions left by the redesign

**Location:** verified zero importers across `src/`:
`src/frontend/thinkinglabs-ui/pages/HomePageComposition.astro` (index.astro inlines its own shell, `src/pages/index.astro:5-6`),
`src/frontend/thinkinglabs-ui/pages/InputDetailPageComposition.astro` (route uses `InputDetailMinimalPageComposition` instead, `src/pages/inputs/[...slug].astro:4`),
`components/ConfidenceMeter.astro`, `components/DotLabel.astro`, `components/EntityBody.astro`, `components/IndexHero.astro`, `components/StatBand.astro`, and `components/EntityShaderSurface.astro` (+ its transitively-dead `EntityShaderSurface.client.ts`).
**Observation:** Two parallel input-detail compositions exist; only the "Minimal" one is wired. `HomePageComposition` is fully bypassed by a hand-rolled `index.astro`. The rest are redesign experiments that lost their last importer.
**Impact:** Dead code inflates the surface a maintainer must reason about, and the dual input compositions invite "edit the wrong file" bugs. Builds still pass, so these silently rot.
**Recommendation:** Delete the orphans (confirm with a build first). If the `HomePageComposition`/inline-`index.astro` divergence is intentional, fold the homepage into the composition pattern for consistency so the home page isn't the one snowflake page.
**Effort:** S

### [Low] Prototype/exploration route shipped in production routing

**Location:** `src/pages/icon-prototypes.astro` + `src/lib/icon-prototypes/` (466-LOC `cartographer-minimal.ts` + `index.ts` + `types.ts`).
**Observation:** `/icon-prototypes` is a real prerendered route backed by a `lib/icon-prototypes/` design-exploration module. It's not in `surfaces.ts`/nav, but it is publicly reachable and is built/shipped to the CDN. Similar in spirit to the mock-data issue: design-exploration material living in production paths.
**Impact:** Public exposure of internal prototypes; build-time and bundle cost; another "is this real or scratch?" question for maintainers.
**Recommendation:** Either gate it behind a dev-only condition (e.g. exclude from build unless an env flag is set), move it out of `src/pages/`, or formally adopt it as a surface in `surfaces.ts`. Decide intentionally rather than leaving it ambiguous.
**Effort:** S

### [Low] 11 near-identical `*StructuredData` functions + per-page manual wiring are an un-registry'd "add a kind" touchpoint

**Location:** `src/lib/structured-data.ts:135-444` (`postStructuredData`, `thoughtStructuredData`, `claimStructuredData`, `projectStructuredData`, `predictionStructuredData`, `changedMyMindStructuredData`, `decisionStructuredData`, `questionStructuredData`, `inputStructuredData`, `observationStructuredData`); wired per page e.g. `src/pages/claims/[...slug].astro:11,30`.
**Observation:** Unlike the API handlers (registry-driven, 4 lines each), structured-data is one bespoke function per kind plus a manual import+prop in each detail page. The functions share most of their structure (breadcrumb + page graph + a few kind-specific fields). This is the one place the otherwise-pervasive registry pattern was not applied.
**Impact:** Adding a kind requires writing a new `*StructuredData` function and remembering to wire it into the new detail page - easy to forget, no compile-time guard. Maintenance changes (e.g. to breadcrumb logic) must be replicated across 11 functions.
**Recommendation:** Drive structured-data from the registry: a single `structuredDataFor(kind, entry, url, site)` dispatcher with per-kind field extractors registered in `KIND_REGISTRY` (or a parallel `Partial<Record<Kind, Extractor>>` with a coverage assertion). Then detail pages call one helper, mirroring `collectionJson`.
**Effort:** M

### [Low] OG route maintains three parallel per-kind `Record` maps separate from the registry

**Location:** `src/pages/og/[...slug].png.ts:149` (`KIND_LAYOUTS`), `:163` (`KIND_ORB_PALETTES`), `:186` (`KIND_SINGULAR`), keyed by `EntityKindKey`.
**Observation:** These are `Record<EntityKindKey, ...>` so omitting a kind fails to compile (good), but they re-enumerate kinds outside the registry and define their own `EntityKindKey` subset (`isEntityKindKey` :467). OG-card presentation metadata is arguably registry-shaped data.
**Impact:** Another (compiler-guarded but separate) place to update when adding/renaming a kind; presentation metadata for a kind is split between `registry.ts` and this route.
**Recommendation:** Lower priority than M7 since the type system catches omissions. Optionally fold `singular`/`ogLayout`/`ogPalette` into `KIND_REGISTRY` entries so all per-kind presentation lives in one place. Acceptable to leave as-is.
**Effort:** M

### [Info] LLM env vars bypass the `env.ts` seam

**Location:** `src/lib/llm.ts:23-25,30,57,62` read `process.env["LLM_MODEL_*"]`, `OPENAI_API_KEY`, `OLLAMA_API_KEY` directly; `src/lib/env.ts` documents itself as "every environment variable read across the codebase" and includes `LLM_PROVIDER` but not these.
**Observation:** `env.ts` is otherwise a clean single seam (zero leakage elsewhere). The LLM module is the lone exception, and the env schema's docstring claims completeness it doesn't have.
**Impact:** Minor inconsistency; a reader trusting `env.ts` as the env contract will miss the model/key vars. No functional risk (`llm.ts` guards on key presence).
**Recommendation:** Either add `LLM_MODEL_FAST|BALANCED|DEEP` and the provider keys to `envSchema` and have `llm.ts` read from `env()`, or soften the `env.ts` docstring to "non-LLM environment variables." Prefer the former for consistency.
**Effort:** S

### [Info] Architecture matches ADRs; docs triplet is correctly single-sourced

**Location:** `AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md` are byte-identical (same md5), propagated from `.harness/src` per the Harness-source invariant. Storybook references have been fully removed from docs (consistent with the `.storybook/` deletions in the working tree).
**Observation:** No ADR drift found in the backend. ADR-001 (source/index), ADR-002 (schema registry), ADR-008/009 (review-cli + proposal/confirmation), ADR-010/013 (MCP factory + two transports) are all implemented as written. The three agent-config files are not drift - they're generated copies.
**Impact:** Positive; recorded so it isn't re-flagged.
**Recommendation:** None.

## Quick wins (ranked)

1. **Rewrite `docs/conventions/components.md`** to match reality and document the two component homes (M2, L3). It's the onboarding doc and is currently misleading. - S
2. **Delete dead code**: `EmptyState.astro`, the 8 orphaned compositions/components + `EntityShaderSurface.client.ts` (L3, L5). Confirm with one build. - S
3. **Wire `/brain-diff` to the real feed artifact** and drop the `mocks/extras.ts` import (M4). Removes fabricated production content. - M (smallish)
4. **Decide on `/icon-prototypes`**: dev-gate, relocate, or formalize (L6). - S
5. **Reconcile LLM env vars with `env.ts`** or fix the docstring (Info M4/I8). - S

## Larger refactors (ranked)

1. **Decompose `thinkinglabs-ui.ts`** into `view-text.ts` + per-kind `view-models/<kind>.ts` + `view-lookups.ts`, mirroring `src/schemas/` (M1). Highest single-file complexity reduction. - M
2. **Registry-drive structured data** with a `structuredDataFor(kind, ...)` dispatcher + coverage assertion, eliminating 11 bespoke functions and per-page manual wiring (M7). Closes the last big "add a kind" gap. - M
3. **Optionally fold OG presentation metadata into `KIND_REGISTRY`** so all per-kind presentation lives in one place (L8). Lower value (compiler already guards it). - M

## What's already good (keep)

- `src/lib/registry.ts` as the single kind/view fact-source with compile-time coverage assertions (`registry.ts:439-441`, `content.config.ts:54-58`). This resolves the prior review's top P1 and is the model the rest of the per-kind code should follow.
- The `collectionJson(kind)` API-handler factory - 4-line handlers, zero per-kind branching (`src/pages/api/*.json.ts`).
- The MCP single-factory/two-transport split with transport-only concerns isolated (`servers/thinkinglabs-mcp/server.ts`, `servers/thinkinglabs-mcp-http/server.ts:178`).
- The `env.ts` Zod env seam with no leakage outside it (the LLM module excepted).
- The proposal/dispatch registry with same-reference-idempotent registration and a startup exhaustiveness check (`src/lib/proposal-dispatch.ts`).
- One-directional data flow with `frontend/thinkinglabs-ui/types.ts` as the contract boundary: frontend imports nothing from `src/lib`; pages map source → view-model → typed composition.
- Per-kind schema split in `src/schemas/` - the exact granularity `thinkinglabs-ui.ts` should adopt.

## Open questions for the maintainer

1. **Is the homepage divergence intentional?** `index.astro` hand-rolls its shell and bypasses `HomePageComposition.astro`. Should the home page join the composition pattern, or is `HomePageComposition` meant to be deleted?
2. **What is the intended source for `/brain-diff`?** The real feeds exist; was rendering `BRAIN_DIFF` mock data a placeholder during the redesign that was never swapped back?
3. **What is the rule for `src/components/` vs `src/frontend/thinkinglabs-ui/components/`?** If it's "head/SEO/embed vs visual UI," should that be enforced/documented, and should `src/components/` eventually be absorbed?
4. **Should `/icon-prototypes` and `mocks/` ship to production at all?** Both look like design-time artifacts that leaked into the build.
5. **Is the `feat-design-v2` redesign considered "landing"?** Several findings (orphans, stale convention doc, mock content) are typical mid-redesign debt; a cleanup pass before merge to `main` would clear most of the Low/Medium items at once.
