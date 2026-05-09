# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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

Package manager is `pnpm` (v10, see `packageManager` in `package.json`). Node ≥ 22.19.0.

- `pnpm dev` — Astro dev server for the site
- `pnpm start` — `astro preview` on `0.0.0.0:${PORT:-4321}` (DigitalOcean entrypoint). Vite preview options live in `astro.config.mjs` under `vite.preview`, not `vite.config.js`.
- `pnpm storybook` / `pnpm storybook:build` — Storybook v10 dev server and static build
- `pnpm build` — `astro check && astro build` (typecheck + build; validates every frontmatter file against its Zod schema)
- `pnpm build:index` — rebuild the derived `dist/index.sqlite` query layer
- `pnpm artifacts` — offline artifact build: brain-diff feeds, site, `public/llms.txt`, JSON feeds, `dist/index.sqlite`
- `pnpm artifacts:scored` — same artifact build, but requires LLM-scored brain-diff output
- `pnpm verify` — local verification: empty-content path plus fixture-content structured-data path
- `pnpm verify:empty` / `pnpm verify:fixtures` — run one validation shape explicitly
- `pnpm typecheck` / `pnpm check` / `pnpm lint` / `pnpm format` — `astro check`, `vp check`, `vp lint`, `vp fmt`
- `pnpm test` — `vp test run` (Vitest under Vite+); single test: `pnpm test -- path/to/file.test.ts -t "test name"`
- `pnpm setup:e2e` / `pnpm test:e2e` — install Chromium / build fixtures and run Playwright
- `pnpm mcp:thinkinglabs` — run the personal MCP server over **stdio** (`servers/thinkinglabs-mcp/cli.ts`); accepts `--repo-root <path>`
- `pnpm mcp:thinkinglabs:http` — run the same MCP server over **Streamable HTTP** (`servers/thinkinglabs-mcp-http/cli.ts`); stateless mode, default `http://127.0.0.1:8787/mcp`. Accepts `--repo-root <path>`, `--host <addr>`, `--port <n>`. Public deployment knobs via `MCP_HTTP_HOST`, `MCP_HTTP_PORT`, `MCP_HTTP_ALLOWED_HOSTS`, `MCP_HTTP_ALLOWED_ORIGINS`, `MCP_HTTP_TRUST_PROXY` — see `.env.example` and [`docs/agents/mcp-http-server.md`](./docs/agents/mcp-http-server.md)

Background-agent CLIs (proposal-emitting; safe to re-run): `pnpm dormant-flip`, `pnpm review-decisions`, `pnpm resolve-predictions`, `pnpm freshness-review`, `pnpm triage-questions`. Drain the queue interactively with `pnpm review-proposals`. Other curation CLIs: `pnpm derive-claims`, `pnpm review-stale-claims`. Diff feed driver: `pnpm brain-diff` (`scripts/brain-diff.ts`).

LLM-mediated CLIs require the active provider key (`OPENAI_API_KEY` by default, or `OLLAMA_API_KEY` with `LLM_PROVIDER=ollama`; see `.env.example`). Pass `--no-llm` to skip LLM calls and exit with zero proposals. `BUILD_NOW_ISO` / `FRESHNESS_NOW_ISO` freeze "now" for deterministic builds and tests.

## Architecture

This is a personal knowledge / agentic-space repo. Architectural decisions live in [`docs/architecture/`](./docs/architecture/) (ADR-001 through ADR-013). Pipeline how-tos are in [`docs/agents/`](./docs/agents/). Read the relevant ADR before changing a pipeline — they capture _why_, not just what.

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

All LLM calls go through `runToolCall` in `src/lib/llm.ts` (Vercel AI SDK + `@ai-sdk/openai`). Providers/models are selected via `LLM_PROVIDER`, `LLM_MODEL_FAST|BALANCED|DEEP`, and a `ModelTier` abstraction (`"fast"` / `"balanced"` / `"deep"`). `runToolCall` returns `{ data, model }`, where `model` is the contract-first `ModelRef` persisted into `content/provenance/` only after an AI-assisted effect is accepted. When the active provider API key is absent, `runToolCall` is guarded — no network call. Don't instantiate SDK clients directly in new callers; compose against `runToolCall`.

### Rendering

Astro pages, `/api/<kind>.json.ts` handlers, and `public/llms.txt` all derive from typed `getCollection(kind)` plus the inventory in `src/lib/surfaces.ts`. New public surface = append to `surfaces.ts`. Markdown bodies pass through `src/markdown/remark-section-freshness.ts` + `src/markdown/rehype-section-freshness.ts` (wired in `astro.config.mjs`) to add per-section freshness pills from Pandoc-style `## Title {#id last_verified="YYYY-MM-DD"}` headings; both no-op on content lacking the syntax. `/claims/<slug>` renders confidence history via `walkFileHistory` + `parseClaimHistory` — read-only at render time.

Shared components (`src/components/`: `StatusPill`, `Tags`, `MetaBlock`, `EmptyState`) are kind-agnostic. Per-kind logic belongs in the page file or a `src/lib/<kind>.ts` helper, never in a component. See [`docs/conventions/components.md`](./docs/conventions/components.md).

### MCP server (ADR-010, ADR-013)

A single server factory — `createThinkinglabsMcpServer({ repoRoot })` in `servers/thinkinglabs-mcp/server.ts` — backs two transports. Both expose the same fixed JSON views (`thinkinglabs://thoughts`, `thinkinglabs://claims/by-tag/{tag}`, `thinkinglabs://predictions/calibration`, etc.) and tools (`query_view`, `contact.precheck`, `contact.send`, `question.submit`, `subscribe_brain_diff`). The store prefers `dist/index.sqlite` and falls back to validated markdown under `content/`.

- **Stdio** (`servers/thinkinglabs-mcp/cli.ts`, `pnpm mcp:thinkinglabs`) — local, no network. See [`docs/agents/mcp-server.md`](./docs/agents/mcp-server.md).
- **Streamable HTTP** (`servers/thinkinglabs-mcp-http/`, `pnpm mcp:thinkinglabs:http`) — remote, no clone required. Stateless mode (fresh `McpServer` + `StreamableHTTPServerTransport` per POST), `enableJsonResponse: true`, raw `node:http` (no Express dep). DNS-rebinding protection via `MCP_HTTP_ALLOWED_HOSTS`/`MCP_HTTP_ALLOWED_ORIGINS`; CORS exposes `Mcp-Session-Id` and `MCP-Protocol-Version`; in-memory token-bucket rate limiter (default 30 burst / 1 RPS per IP, key from `req.socket.remoteAddress` unless `MCP_HTTP_TRUST_PROXY=1`); 1 MiB body cap; `GET /healthz` for LB probes; `GET`/`DELETE /mcp` return 405. See [`docs/agents/mcp-http-server.md`](./docs/agents/mcp-http-server.md).

Behaviour changes that affect both transports go in the factory at `servers/thinkinglabs-mcp/server.ts`. Transport-specific concerns (rate limiting, CORS, body parsing) live in `servers/thinkinglabs-mcp-http/server.ts` only.

## Path alias

`@/*` maps to `src/*` (see `tsconfig.json`). TS is `astro/tsconfigs/strictest` plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
