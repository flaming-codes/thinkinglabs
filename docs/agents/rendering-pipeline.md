# Rendering pipeline

Listing pages, detail pages, the per-collection JSON APIs under `/api/`, and `public/llms.txt` all derive from the same two sources: Astro's typed `getCollection(kind)` over `content/<kind>/` (validated by `src/schemas/`) and the inventory in `src/lib/surfaces.ts`. A new public surface is added by appending an entry to `surfaces.ts`; nav and `llms.txt` pick it up automatically on the next build. A new object kind is added by writing a Zod schema in `src/schemas/<kind>.ts`, registering it in `src/schemas/index.ts`, declaring the collection in `src/content.config.ts`, then adding listing + detail pages and a one-line `src/pages/api/<kind>.json.ts` that re-exports `collectionJson("<kind>")`.

The site renderer never reads `dist/index.sqlite`; the index is for agents. Schemas are the single source of typing for both runtime validation and `getCollection` return types. Per-kind logic stays in the page file (or a kind-specific helper in `src/lib/`); shared components in `src/components/` (`StatusPill`, `Tags`, `MetaBlock`, `EmptyState`) accept generic props and stay schema-agnostic.

Markdown bodies pass through two custom plugins wired in `astro.config.mjs`. `src/markdown/remark-section-freshness.ts` lifts Pandoc-style heading attributes (`## Title {#id last_verified="YYYY-MM-DD"}`) into `hProperties`. `src/markdown/rehype-section-freshness.ts` appends a `<span class="freshness-pill">` to any heading carrying `data-last-verified`, color-coded by age via `src/lib/freshness.ts`. Both plugins no-op on content that lacks the syntax, so they cost effectively nothing on non-posts kinds. The build-time "now" honors `FRESHNESS_NOW_ISO` for deterministic test and CI builds.

## Claim history rendering

`/claims/<slug>` renders a confidence-over-time history table by calling `walkFileHistory(cwd, repoRelativePath)` from `src/lib/git.ts` and parsing each revision via `parseClaimHistory` in `src/lib/claim-history.ts`. The history is read-only at render time; all writes to claim files happen through the derivation CLI (`scripts/derive-claims.ts`) or the stale-review CLI (`scripts/review-stale-claims.ts`), neither of which is invoked at build time.
