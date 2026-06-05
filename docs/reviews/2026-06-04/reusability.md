# Reusability & DRY Review - Thinking Labs (2026-06-04)

**Reviewer:** Reusability · **Branch:** feat-design-v2 @ 1e73fd0

---

## Executive summary

The repository's reusability story is genuinely strong at its top two layers: the API handlers are textbook one-liners over `collectionJson`, and the listing pages are thin wrappers that delegate almost all logic to typed composition components and `mapXxx` functions in `thinkinglabs-ui.ts`. The detail-page layer is also well-structured after the recent "generic detail layout components" commit, with `EntityDetail → DetailPage → DetailHero/Body/Footer` forming a clean hierarchy. The main DRY debt lives at the CSS level inside `*DetailPageComposition.astro` files, where the `.tl-lede / .tl-eyebrow / .tl-lede-text` block is copy-pasted verbatim into six compositions (roughly 90 duplicated CSS lines), and at the TS level where `src/lib/thinkinglabs-ui.ts` has grown to 1,566 lines without domain boundaries. A secondary issue is that `parseRef` is independently reimplemented in two separate lib files, and `byDateDesc` in `sort.ts` is exported but never imported by the file doing almost all sorting. Overall reusability health: **Good with targeted debt** (7/10).

---

## Scope & method

Read-only static analysis of the `feat-design-v2` branch. Files read or searched:

- All `src/pages/<kind>/index.astro` and `src/pages/<kind>/[...slug].astro` (11 + 10 files)
- All `src/pages/api/*.json.ts` (10 files) and `src/lib/api.ts`
- All `src/lib/agents/*.ts` (5 agents) plus `proposal-dispatch.ts`, `proposal-queue.ts`, `proposal-rejections.ts`, `review-cli.ts`
- `src/components/` (4 files) and `src/frontend/thinkinglabs-ui/components/` (35 files)
- `src/frontend/thinkinglabs-ui/pages/` (32 compositions) and `mocks/` (6 files, 1,372 LOC total)
- `src/lib/thinkinglabs-ui.ts` (1,566 LOC), `src/lib/sort.ts`, `src/lib/entity-routes.ts`, `src/lib/route-helpers.ts`, `src/lib/markdown-routes.ts`, `src/lib/refs.ts`, `src/lib/structured-data.ts`, `src/lib/registry.ts`, `src/lib/surfaces.ts`
- `src/frontend/thinkinglabs-ui/types.ts` (540 LOC) and `src/frontend/thinkinglabs-ui/lib/entity-hero.ts`

---

## Findings

### [Medium] `.tl-lede / .tl-eyebrow / .tl-lede-text` CSS block duplicated across six compositions

**Location:**

- `src/frontend/thinkinglabs-ui/pages/DecisionDetailPageComposition.astro:97-117`
- `src/frontend/thinkinglabs-ui/pages/ProjectDetailPageComposition.astro:81-100`
- `src/frontend/thinkinglabs-ui/pages/ChangedMyMindDetailPageComposition.astro:62-80`
- `src/frontend/thinkinglabs-ui/pages/ObservationDetailPageComposition.astro:48-67`
- `src/frontend/thinkinglabs-ui/pages/QuestionDetailPageComposition.astro:91-110`
- `src/frontend/thinkinglabs-ui/pages/PredictionDetailPageComposition.astro:107-125`

**Observation:** Each file contains an identical (or near-identical) `<style>` block:

```css
/* DecisionDetailPageComposition.astro lines 97-116 */
.tl-lede {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-block: 1.5em;
}
.tl-eyebrow {
  margin: 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.5;
}
.tl-lede-text {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.4;
}
```

The same block is copy-pasted verbatim into five other compositions. `AppShell.astro:162-177` already defines the eyebrow typography globally via `:global(.tl-eyebrow)`, but the `tl-lede` wrapper and `tl-lede-text` sizing are not in any shared location.

**Impact:** ~90 duplicated CSS lines across six files. Any typography change (e.g., adjusting `font-size: 0.75rem` on the eyebrow) requires six edits. Astro scoped styles mean the duplication is silent at runtime (no specificity conflicts), but it is a maintenance hazard.

**Recommendation:** Extract `.tl-lede`, `.tl-eyebrow`, and `.tl-lede-text` into a new `EntityLede.astro` component (or add them to a shared CSS layer in `AppShell.astro`'s `:global` block alongside the existing eyebrow rules). A component approach also consolidates the `<div class="tl-lede"><p class="tl-eyebrow">...</p><p class="tl-lede-text">...</p></div>` JSX pattern that appears in those same six files.

**Effort:** S (1-2 hours)

---

### [Medium] `parseRef` implemented independently in two places

**Location:**

- `src/lib/thinkinglabs-ui.ts:157-170` (`function parseRef(ref: string, fallbackKind: Kind)`)
- `src/lib/markdown-routes.ts:604-616` (`function parseRef(rawRef: string)`)

**Observation:**

`thinkinglabs-ui.ts:157`:

```typescript
function parseRef(ref: string, fallbackKind: Kind): { kind: Kind; slug: string; href: string } {
  const withoutAnchor = ref.split("#")[0] ?? ref;
  const normalized = stripMdExt(withoutAnchor);
  const [maybeKind, ...rest] = normalized.split("/");
  if (maybeKind !== undefined && KIND_SET.has(maybeKind as Kind) && rest.length > 0) {
    const kind = maybeKind as Kind;
    const slug = rest.join("/");
    return { kind, slug, href: detailHref(kind, slug) };
  }
  const slug = stripKindPrefix(normalized);
  return { kind: fallbackKind, slug, href: detailHref(fallbackKind, slug) };
}
```

`markdown-routes.ts:604`:

```typescript
function parseRef(rawRef: string): { readonly kind: PublicMarkdownKind | null; readonly slug: string; readonly anchor?: string } {
  const withoutMd = rawRef.replace(/\.md(#.*)?$/, "$1");
  const [pathPart = "", anchorPart] = withoutMd.replace(/^\/+/, "").split("#", 2);
  const [maybeKind, ...slugParts] = pathPart.split("/");
  const kind = isPublicMarkdownKind(maybeKind) && slugParts.length > 0 ? maybeKind : null;
  const slug = kind ? slugParts.join("/") : pathPart;
  ...
}
```

Both functions parse `kind/slug.md#anchor` references using the same structural logic. The `markdown-routes.ts` version also extracts anchors and returns a nullable kind; the `thinkinglabs-ui.ts` version takes a fallback kind. `src/lib/refs.ts` already abstracts `stripKindPrefix` and `stripMdExt` as shared helpers, showing intent to share ref-parsing logic.

**Impact:** Any future change to the reference format (e.g., supporting nested slugs differently, adding a new prefix scheme) must be replicated in two places. The functions also differ subtly in anchor handling, which can introduce inconsistencies.

**Recommendation:** Consolidate into one `parseRef` in `src/lib/refs.ts` with optional fallbackKind and anchor extraction. Both callers can then use it. `markdown-routes.ts` has the more complete version (anchor-aware).

**Effort:** M (2-4 hours, test coverage needed)

---

### [Medium] `byDateDesc` in `sort.ts` is never used; `thinkinglabs-ui.ts` inlines 15+ inline sort comparators

**Location:**

- `src/lib/sort.ts:2` (exported but zero imports anywhere)
- `src/lib/thinkinglabs-ui.ts:238,256,541,576,663,789,906,942,1109,1143,1199,1280,1363,1432,1452,1507` (inline comparators)

**Observation:** `sort.ts` exports `byDateDesc`, but `grep -rn "byDateDesc"` finds no caller. Meanwhile `thinkinglabs-ui.ts` sorts by date in at least 15 places using ad hoc comparators built on `safeDate()` (e.g., `(a, b) => safeDate(b.data.updated) - safeDate(a.data.updated)`). The helper in `sort.ts` uses `Date.parse` on the raw value; `thinkinglabs-ui.ts`'s `safeDate` also handles `Date` instances. The two approaches are equivalent for ISO strings but the `thinkinglabs-ui.ts` version is more robust.

**Impact:** `sort.ts` is dead code. The real sorting logic is scattered inline. If the null-date sentinel value needs changing (currently `0`), all 15 call sites need updating.

**Recommendation:** Either delete `sort.ts` and document a shared `safeDate`-based comparator inside `thinkinglabs-ui.ts`, or migrate `sort.ts` to use `safeDate` and wire up callers. The former is simpler since all sorting is in one file already.

**Effort:** S (30 min to delete + minor cleanup)

---

### [Medium] Five detail pages re-implement `getStaticPaths` inline instead of using `getKindStaticPaths`

**Location:**

- `src/pages/posts/[...slug].astro:9-12`
- `src/pages/projects/[...slug].astro:10-13`
- `src/pages/changed-my-mind/[...slug].astro:13-16`
- `src/pages/inputs/[...slug].astro:9-12`
- `src/pages/questions/[...slug].astro:9-13`

**Observation:** Five detail pages implement their own `getStaticPaths` like:

```typescript
export const getStaticPaths = (async () => {
  const items = await getCollection("posts");
  return items.map((post) => ({ params: { slug: post.id }, props: { entry: post } }));
}) satisfies GetStaticPaths;
```

But `src/lib/route-helpers.ts` already provides `getKindStaticPaths("posts")` that does exactly this. The other five detail pages (claims, decisions, observations, predictions, thoughts) already call `getKindStaticPaths`. There is no apparent reason for the divergence.

**Impact:** Three distinct patterns for the same operation create confusion about which to use. A new kind author may pick the wrong one.

**Recommendation:** Migrate the five inline implementations to `getKindStaticPaths`. Straightforward mechanical change.

**Effort:** S (30 min)

---

### [Low] Duplicated slug extraction regex `proposal.target.replace(/.*\//, "").replace(/\.md$/, "")` in three agent reject handlers

**Location:**

- `src/lib/agents/dormant-flip.ts:131`
- `src/lib/agents/review-decisions.ts:123`
- `src/lib/agents/resolve-predictions.ts:297`

**Observation:** All three `reject` handlers extract the slug from a file path with identical code:

```typescript
const slug = proposal.target.replace(/.*\//, "").replace(/\.md$/, "");
```

`src/lib/refs.ts` already exports `stripMdExt`; the first `.replace` is just `path.basename`. A one-liner `path.basename(proposal.target, ".md")` would be cleaner and shared.

**Impact:** Minor: if the target path convention ever changes, three places need updating. This is a very low-risk item.

**Recommendation:** Replace with `basename(proposal.target, ".md")` (node:path is already imported in triage-questions). Or add a `slugFromFilePath` helper to `refs.ts`.

**Effort:** XS (15 min)

---

### [Low] `thinkinglabs-ui.ts` is a 1,566-line God module without domain boundaries

**Location:** `src/lib/thinkinglabs-ui.ts` (full file)

**Observation:** The file exports 25+ map/build functions covering every domain: home, now, claims, thoughts, posts, projects, predictions, changed-my-mind, decisions, questions, inputs, observations, and calibration. Internal helpers (`safeDate`, `truncate`, `stripInlineMarkdown`, `markdownParagraphs`, `wordCount`, etc.) are private to this file despite being potentially useful elsewhere. The file has no section markers.

**Impact:** Discoverability suffers; developers hunting for claim-specific logic must search through 1,566 lines shared with unrelated post and prediction logic. Not a correctness issue, but a friction issue for contributors. The types file (`types.ts`, 540 LOC) is similarly monolithic.

**Recommendation:** This does not need immediate splitting, but adding `// --- SECTION: claims ---` header comments at each domain boundary would significantly improve navigation. A longer-term move is splitting into `src/lib/ui-maps/claims.ts`, `src/lib/ui-maps/posts.ts`, etc., re-exporting everything from an index. ADR guidance applies: the current structure is consistent with the project's "no code-splitting for its own sake" stance, so section comments are the right quick win.

**Effort:** S (comments only) / L (full split)

---

### [Low] `InputDetailPageComposition` (old-design) and `InputDetailMinimalPageComposition` (new-design) coexist; only the Minimal variant is used in production

**Location:**

- `src/frontend/thinkinglabs-ui/pages/InputDetailPageComposition.astro` (177 LOC, uses AppShell)
- `src/frontend/thinkinglabs-ui/pages/InputDetailMinimalPageComposition.astro` (99 LOC, uses EntityDetail)
- `src/pages/inputs/[...slug].astro:4` (imports only Minimal)

**Observation:** `InputDetailPageComposition` uses the older `AppShell` layout, bespoke CSS, and a completely separate visual structure. `InputDetailMinimalPageComposition` uses the new `EntityDetail` hierarchy that all other detail pages use. The production page only imports the Minimal variant. The old composition is unreachable from any production route.

**Impact:** 177 lines of dead composition code. New feature work risks going into the wrong file. Future developers may be confused about which is authoritative.

**Recommendation:** Delete `InputDetailPageComposition.astro` (the non-Minimal one). The name "Minimal" in the surviving file is now misleading; rename it to `InputDetailPageComposition.astro` after deletion.

**Effort:** S (20 min, pure cleanup)

---

### [Info] `EntityHero` is a thin wrapper over `DetailHero` with no additional logic

**Location:**

- `src/frontend/thinkinglabs-ui/components/EntityHero.astro` (wraps `DetailHero`, adds default `SiteNav` slot)
- `src/frontend/thinkinglabs-ui/components/DetailHero.astro` (the real implementation)

**Observation:** `EntityHero` does exactly one thing: adds `<SiteNav />` as the default nav slot for `DetailHero`. It is not used anywhere in the codebase (all `*DetailPageComposition` files consume `EntityDetail → DetailPage → DetailHero` via the chain; none import `EntityHero` directly). `DetailHero` already provides `<SiteNav />` as its default slot content.

**Impact:** Dead component; zero callers. No correctness risk.

**Recommendation:** Delete `EntityHero.astro`. The nav default is already handled inside `DetailHero.astro` directly.

**Effort:** XS (5 min)

---

### [Info] Listing page `const site = Astro.site ?? new URL(Astro.url.origin)` repeated 21 times

**Location:** Every listing and detail page in `src/pages/` (21 occurrences)

**Observation:** Every page file contains:

```typescript
const site = Astro.site ?? new URL(Astro.url.origin);
```

This is the canonical pattern for resolving the base URL before calling `structuredData` helpers. The pattern is correct and intentional, but it is repeated verbatim in every file.

**Impact:** Pure DRY issue; no correctness risk. If `Astro.site` semantics change, 21 edits are needed.

**Recommendation:** The `ThinkinglabsUiPage.astro` layout already computes `site` internally (line 22) and passes it to `buildPageGraph`. An alternative: export a `resolveSite(astro: AstroGlobal)` helper from `src/lib/site.ts` or `src/lib/structured-data.ts`. Calling pages become `const site = resolveSite(Astro)`. Low priority because it is purely mechanical repetition with no divergence risk.

**Effort:** S (30 min)

---

## Duplication hotspots (table)

| Pattern                                                                            | Files affected                             | Est. duplicated LOC    | Suggested extraction                                         |
| ---------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------- | ------------------------------------------------------------ |
| `.tl-lede` / `.tl-eyebrow` / `.tl-lede-text` CSS block                             | 6 `*DetailPageComposition.astro`           | ~90                    | `EntityLede.astro` component or shared global CSS layer      |
| `parseRef` internal function                                                       | `thinkinglabs-ui.ts`, `markdown-routes.ts` | ~25                    | `src/lib/refs.ts` (already exists as home for ref helpers)   |
| Inline `getStaticPaths` that duplicates `getKindStaticPaths`                       | 5 detail page routes                       | ~15                    | Use existing `getKindStaticPaths`                            |
| `proposal.target.replace(/.*\//)...replace(/.md$/)`                                | 3 agent reject handlers                    | ~3                     | `basename(target, ".md")` or `slugFromFilePath` in `refs.ts` |
| `const site = Astro.site ?? ...`                                                   | 21 listing+detail pages                    | ~21                    | `resolveSite(Astro)` helper in `site.ts`                     |
| `byDateDesc` in `sort.ts` (dead export vs 15 inline sorts in `thinkinglabs-ui.ts`) | 1 dead file + 1 big file                   | ~9 dead + 45 scattered | Delete or consolidate                                        |

---

## Over-abstraction notes

**`EntityDetail → DetailPage → DetailHero/Body/Footer`:** This four-level hierarchy (`EntityDetail` wraps `DetailPage` which wraps three sub-components) is genuinely warranted because `EntityDetail` handles the `EntityRelationGroup → DetailLinkGroup` shape conversion. The hierarchy earned its complexity. It is not over-abstracted.

**`ThinkinglabsUiPage` layout:** A single layout file for all 32 pages is appropriate for this site's scale. No concern.

**`ListingPageComposition → EntityIndexPageComposition`:** Each listing page is a small adapter that transforms its typed view into the generic `EntityIndexPage` shape before delegating to `EntityIndexPageComposition`. This is a reasonable pattern: the adapter layer is ~50 lines, the generic renderer handles all 10 listing pages uniformly. Not over-abstracted.

**`proposal-dispatch / proposal-queue / proposal-rejections`:** The scaffolding is cleanly decomposed. Each agent registers a handler at module load; the review CLI drains the queue generically. No over-abstraction here; each piece is used by every agent.

**`sort.ts` with `byDateDesc`:** This is an abandoned abstraction. The function was presumably extracted at some point but never wired into the callers that needed it. It is now dead weight rather than a useful primitive.

---

## Quick wins (ranked)

1. **Delete `src/lib/sort.ts`** (or migrate its `byDateDesc` to use `safeDate` and wire callers). Pure removal of dead code. (XS)
2. **Delete `EntityHero.astro`**. Zero callers, already provided by `DetailHero`. (XS)
3. **Delete `InputDetailPageComposition.astro`** (non-Minimal). Dead composition; rename Minimal to the canonical name. (S)
4. **Migrate 5 inline `getStaticPaths` to `getKindStaticPaths`**. Mechanical find-and-replace. (S)
5. **Extract `.tl-lede / .tl-eyebrow / .tl-lede-text` into a shared location**. Either a global CSS layer or an `EntityLede.astro` component. (S)
6. **Replace the 3 `proposal.target.replace(...)` slug extractions** with `basename(target, ".md")`. (XS)

---

## Larger refactors (ranked)

1. **Consolidate `parseRef`** from two files into `src/lib/refs.ts`. Requires tests to confirm identical behavior. (M)
2. **Add domain-section comments to `thinkinglabs-ui.ts`** to make the 1,566-line file navigable without splitting. Optional follow-up: split into `src/lib/ui-maps/` sub-modules. (S for comments, L for split)
3. **Extract `resolveSite(Astro)` helper** to deduplicate the 21-occurrence `const site = ...` pattern. (S but low payoff given mechanical nature)

---

## What's already good (keep)

- **API handlers** (`src/pages/api/*.json.ts`): textbook one-liners over a shared factory. Nothing to improve.
- **Listing pages** (`src/pages/<kind>/index.astro`): thin wrappers; `getCollection`, `mapXxxView`, `listStructuredData`, and one composition component. ~25 lines each with zero duplication between them.
- **Agent scaffolding** (`proposal-queue`, `proposal-dispatch`, `proposal-rejections`, `review-cli`): cleanly shared across all five agents. Each agent registers a handler and the CLI drains generically. The `proposalId` deterministic dedup is particularly well-designed.
- **`getKindStaticPaths`**: a clean, typed abstraction. Six of the eleven detail pages already use it correctly.
- **`EntityDetail → DetailPage → DetailHero/Body/Footer`** hierarchy: the recent extraction commit landed well. The generics are used by all 10+ non-special detail compositions.
- **`EntityIndexPageComposition` + per-kind adapters**: all 10 listing compositions use it uniformly. The `EntityIndexPage` shape is a clean DTO boundary.
- **`KIND_REGISTRY`**: single source of truth consumed by the site, MCP server, API handlers, and CLIs. This is the right pattern for this codebase's scale.
- **`sort.ts` intent** (even though the exported function is dead): the `safeDate` helper inside `thinkinglabs-ui.ts` is correctly private and used consistently for all date comparisons in that file.
