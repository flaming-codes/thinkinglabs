# ADR-004 — Renderer pipeline derives from Astro collections, not the index

- **Status**: Accepted
- **Date**: 2026-04-30
- **Supersedes**: —
- **Superseded by**: —

## Context

M2 ships listing and detail pages, JSON API endpoints, and the `llms.txt` agent surface for six object kinds. ADR-001 keeps `content/` as the source of truth and `dist/index.sqlite` as a derived index for agents. The site renderer needs a query path; using the sqlite index would couple every Astro build to `pnpm build:index` ordering and pull better-sqlite3 into the Vite build graph. It would also force the renderer to reparse JSON-encoded frontmatter that Astro has already validated through Zod. Direction-correctness in the calibration math was also unspecified — for a calibration plot to make sense a confidence-0.2 prediction that resolves false has to count as correct, not wrong.

## Decision

The site renderer reads source via Astro's `getCollection()` exclusively. The sqlite index is built only for agents and the future MCP server, and the site never imports from `src/index/builder.ts` at render time. Pages discover one another through `src/lib/surfaces.ts` — the single inventory consumed by both the top navigation and `scripts/build-llms-txt.ts`, eliminating drift between human nav and agent-readable index. Calibration uses a direction-correctness rule (`confidence ≥ 0.5 ∧ resolution=true` or `confidence < 0.5 ∧ resolution=false` is correct, anything else is wrong); ambiguous and pending resolutions are filtered before bucketing. Project `last_touched` derivation lives in `src/lib/git.ts` with a per-build memoization cache so multiple call sites for the same file share one git invocation.

## Consequences

The render path stays type-safe end-to-end: Zod schemas drive both the runtime parse and the inferred type returned by `getCollection`. No detail-page renderer re-parses markdown — Astro's `render()` returns a typed `<Content />` component. Adding a new kind in M3+ means adding a schema, a directory under `content/`, an entry in `src/lib/surfaces.ts`, listing/detail pages, and one API one-liner; no other surface needs to learn about the new kind. Cost: the index and the renderer evolve on independent schedules, so a renderer change cannot break the index or vice versa, but a schema addition has to remember both consumers.

## Alternatives considered

Reading from `dist/index.sqlite` in the Astro build was rejected because it inverts the layering (renderer depends on a derived artifact instead of canonical source) and because Astro's content pipeline already validates and caches what we'd otherwise re-query. Computing `last_touched` inline in each Astro page was rejected on DRY grounds — the helper is shared and memoized. Hand-maintaining the homepage nav and `llms.txt` separately was rejected for the same reason.
