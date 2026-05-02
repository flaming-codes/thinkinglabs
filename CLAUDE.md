# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.

<!--VITE PLUS END-->

## Common commands

Package manager is `pnpm` (v10, see `packageManager` in `package.json`). Node ≥ 22.

- `pnpm dev` — Astro dev server for the site
- `pnpm build` — `astro check && astro build` (typecheck + build; validates every frontmatter file against its Zod schema)
- `pnpm build:index` — rebuild the derived `dist/index.sqlite` query layer
- `pnpm verify` — full local CI: clean, typecheck, `vp check`, build, build index, test
- `pnpm typecheck` / `pnpm check` / `pnpm lint` / `pnpm format` — `astro check`, `vp check`, `vp lint`, `vp fmt`
- `pnpm test` — `vp test run` (Vitest under Vite+); single test: `pnpm test -- path/to/file.test.ts -t "test name"`
- `pnpm mcp:me` — run the personal MCP server (`servers/me-mcp/cli.ts`); accepts `--repo-root <path>`

Background-agent CLIs (proposal-emitting; safe to re-run): `pnpm dormant-flip`, `pnpm review-decisions`, `pnpm resolve-predictions`, `pnpm freshness-review`, `pnpm triage-questions`. Drain the queue interactively with `pnpm review-proposals`. Other curation CLIs: `pnpm derive-claims`, `pnpm review-stale-claims`. Diff feed driver: `pnpm brain-diff` (`scripts/brain-diff.ts`).

LLM-mediated CLIs require `OPENAI_API_KEY` (see `.env.example`); pass `--no-llm` to skip LLM calls and exit with zero proposals. `BUILD_NOW_ISO` / `FRESHNESS_NOW_ISO` freeze "now" for deterministic builds and tests.

## Architecture

This is a personal knowledge / agentic-space repo. The full execution plan lives at `~/.claude/plans/brainstorm-more-realisitc-ideas-merry-rain.md`; architectural decisions are in [`docs/architecture/`](./docs/architecture/) (ADR-001 through ADR-012). Pipeline how-tos are in [`docs/agents/`](./docs/agents/). Read the relevant ADR before changing a pipeline — they capture _why_, not just what.

### Source vs index (ADR-001)

`content/<kind>/*.md` is canonical and sacred. Every artifact below it — `dist/index.sqlite`, JSON feeds, MCP responses, the Astro site itself — is **derived, gitignored, and rebuilt deterministically**. No code path mutates the index without going through a source-tree edit first. The site renderer never reads `dist/index.sqlite`; the index is for agents.

### Schemas drive everything (ADR-002)

Every object is a markdown file with YAML frontmatter validated by a per-kind Zod schema in `src/schemas/`. `src/schemas/index.ts` exports `KIND_SCHEMAS` — the single registry consumed by Astro Content Collections (`src/content.config.ts`), the index builder (`src/index/builder.ts`), the MCP server, and CLIs. Adding a new kind = new `src/schemas/<kind>.ts` + entry in `KIND_SCHEMAS` + `src/content.config.ts` collection + listing/detail pages + a one-line `src/pages/api/<kind>.json.ts`. There's a compile-time assertion in `src/content.config.ts` that the collections object covers every `Kind` exactly.

A malformed frontmatter file fails `astro build` _and_ the index builder with a path-and-issue error.

### Two-layer thoughts ↔ claims model (ADR-007)

`thoughts/` is rough-draft prose; `claims/` is atomic structured assertions with confidence in [0,1], evidence, opposing views. Bidirectional link: `thought.claims[]` ↔ `claim.derived_from[]`. `scripts/derive-claims.ts` is the human-curated derivation pipeline (LLM proposes, human accepts/edits/rejects/defers/merges). `scripts/review-stale-claims.ts` re-surfaces claims whose `last_reviewed` aged out.

### Proposal/confirmation pattern for unattended agents (ADR-008, ADR-009)

Five M5 background agents (`dormant-flip`, `review-decisions`, `resolve-predictions`, `freshness-review`, `triage-questions`) live in `src/lib/agents/<agent>.ts` with CLIs in `scripts/<agent>.ts`. They **never write to `content/`**; they enqueue typed `QueuedProposal` objects into `.proposal-queue.json`. `proposalId(...)` is a deterministic SHA-256, so re-runs over unchanged content dedupe naturally. Per-agent rejection memory is `.<agent>-rejections.json` (gitignored).

`scripts/review-proposals.ts` imports each agent module (triggering `registerHandler` calls in `src/lib/proposal-dispatch.ts`), drains the queue interactively via `runReview`, and applies accepted mutations through each handler's `apply` / `edit`. Agent CLIs are schedulable (launchd, see `scripts/launchd/`); `review-proposals` blocks on TTY and **must never be scheduled**. `freshness-review` deliberately has a no-op `reject` hook — staleness is continuous, not event-driven, so "reject" means "not now", not "never".

To add a new agent: module in `src/lib/agents/`, CLI in `scripts/`, `pnpm` script, `import "../src/lib/agents/<agent>.ts"` in `scripts/review-proposals.ts`, optionally a launchd plist. See [`docs/agents/proposal-pipeline.md`](./docs/agents/proposal-pipeline.md).

### Shared CLI primitives (ADR-008)

Any propose-then-curate workflow composes three primitives, never reimplements them: `runReview` (`src/lib/review-cli.ts`) for the keystroke loop with raw-mode guard and `io` injection seam for tests via `PassThrough`; `editInEditor` (`src/lib/editor.ts`) for `$EDITOR`-mediated mutations; `patchFrontmatter` (in `src/lib/frontmatter.ts`) for writing frontmatter back. Note: `runReview`'s `io` is **not** threaded into action handlers — handlers needing extra input close over `process.stdin` directly or delegate to `editInEditor`.

### LLM choke-point (ADR-007 caveats)

All LLM calls go through `runToolCall` in `src/lib/llm.ts` (Vercel AI SDK + `@ai-sdk/openai`). Providers/models are selected via `LLM_PROVIDER`, `LLM_MODEL_FAST|BALANCED|DEEP`, and a `ModelTier` abstraction (`"fast"` / `"balanced"` / `"deep"`). When `OPENAI_API_KEY` is absent, `runToolCall` is guarded — no network call. Don't instantiate SDK clients directly in new callers; compose against `runToolCall`.

### Rendering

Astro pages, `/api/<kind>.json.ts` handlers, and `public/llms.txt` all derive from typed `getCollection(kind)` plus the inventory in `src/lib/surfaces.ts`. New public surface = append to `surfaces.ts`. Markdown bodies pass through `src/markdown/remark-section-freshness.ts` + `src/markdown/rehype-section-freshness.ts` (wired in `astro.config.mjs`) to add per-section freshness pills from Pandoc-style `## Title {#id last_verified="YYYY-MM-DD"}` headings; both no-op on content lacking the syntax. `/claims/<slug>` renders confidence history via `walkFileHistory` + `parseClaimHistory` — read-only at render time.

Shared components (`src/components/`: `StatusPill`, `Tags`, `MetaBlock`, `EmptyState`) are kind-agnostic. Per-kind logic belongs in the page file or a `src/lib/<kind>.ts` helper, never in a component. See [`docs/conventions/components.md`](./docs/conventions/components.md).

### MCP server

`servers/me-mcp/` is a stdio MCP server (`@modelcontextprotocol/sdk`) exposing fixed JSON views (`me://thoughts`, `me://claims/by-tag/{tag}`, `me://predictions/calibration`, etc.) and tools (`query_view`, `contact.precheck`, `contact.send`, `question.submit`, `subscribe_brain_diff`). The store prefers `dist/index.sqlite` and falls back to validated markdown under `content/`. See [`docs/agents/mcp-server.md`](./docs/agents/mcp-server.md).

## Path alias

`@/*` maps to `src/*` (see `tsconfig.json`). TS is `astro/tsconfigs/strictest` plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
