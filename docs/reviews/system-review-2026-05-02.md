# System Review - 2026-05-02

## Scope

This review consolidated four parallel subagent reviews plus a local verification pass over the current repository. The review focused on DRY code, reusability, maintainability, testing quality including e2e coverage, documentation freshness, stale migration/history language, and enterprise modularity.

Subagent tracks:

- Architecture and modularity
- Test strategy and quality gates
- DRY/reusability/maintainability
- Documentation and operational readiness

Local verification:

- `pnpm test` passed: 42 test files, 236 tests.
- No browser/e2e harness was found in `package.json`, tests, docs, or lockfile.

## Executive Summary

The system has a strong foundation: Zod schemas, deterministic index generation, one-line JSON endpoint factories, an LLM choke point, explicit proposal queues, and a broad Vitest suite. The main risk is not lack of structure; it is that several core contracts have been re-declared outside the strongest primitives.

The highest-priority issues are contract drift across MCP/web/API surfaces, inconsistent content loading and validation paths, calibration logic already diverging across public surfaces, quality gates that do not validate the same things locally and in CI, missing browser/e2e coverage for real client behavior, and stale operational docs around LLM providers and feed publication.

## Priority 0 / 1 Action Items

### P1. Centralize Public Kind And Surface Metadata

Evidence:

- `src/schemas/index.ts` defines `KIND_SCHEMAS`.
- `src/content.config.ts` manually mirrors every collection.
- `src/lib/surfaces.ts` manually defines public navigation/API/data/feed surfaces.
- `servers/thinkinglabs-mcp/types.ts`, `servers/thinkinglabs-mcp/store.ts`, and `servers/thinkinglabs-mcp/server.ts` maintain separate MCP view and detail-kind inventories.
- Web/API expose `posts` and `changed-my-mind`; MCP omits them.

Why it matters:

The system claims schemas are the single registry, but public domain shape is spread across several independent lists. Adding or renaming a kind currently requires many synchronized edits and can produce divergent website, JSON API, MCP, and `llms.txt` behavior.

Action:

Introduce a richer `KIND_REGISTRY` or `PUBLIC_SURFACE_REGISTRY` with schema, route, title field, date field, status field, nav/API/MCP exposure, link metadata, and title/summary extractors. Derive `SURFACES`, `publicViewSchema`, MCP resource registration, title extraction, and endpoint metadata from that registry.

### P1. Replace Unsafe Agent Content Walking

Evidence:

- `src/lib/walk-content.ts` reads only one directory level, returns raw `Record<string, unknown>`, skips `_seed`, and silently drops parse errors.
- Astro and the index builder support recursive content via `**/*.md` / recursive walking.
- Agents consume this raw walker in `dormant-flip`, `freshness-review`, `resolve-predictions`, and stale-claim review logic.

Why it matters:

Nested content can render and index while maintenance agents never see it. Schema defaults and validation are also bypassed outside Astro/index builds, so malformed files may be ignored instead of failing with path-rich diagnostics.

Action:

Create a shared content repository module that recursively walks content, derives slugs consistently, validates with `KIND_SCHEMAS[kind].schema`, and returns typed entries. Keep an explicitly named unsafe/raw walker only for debugging or migration work.

### P1. Reuse Prediction Calibration Logic Across Surfaces

Evidence:

- `/predictions/calibration` uses `src/lib/calibration.ts`.
- `thinkinglabs://predictions/calibration` reimplements calibration in `servers/thinkinglabs-mcp/store.ts`.
- The MCP version treats only `resolution === "true"` as correct and limits input through `queryView(..., limit: 50)`, while the shared helper uses directional correctness.

Why it matters:

The web page and MCP resource can report different calibration for the same predictions.

Action:

Make MCP call the shared `calibration()` helper and adapt only the response envelope. Add a cross-surface fixture test that asserts web-domain and MCP-domain calibration agree.

### P1. Align CI And Local Verification Gates

Evidence:

- `pnpm verify` runs `pnpm build` and `pnpm check:structured-data`, but does not run `pnpm build:fixtures`.
- CI runs `pnpm build:fixtures` in the fixture matrix but does not run `check:structured-data`.
- `scripts/check-structured-data.ts` has fixture-specific assertions that no default gate reliably exercises after fixture build.

Why it matters:

Local verification and CI do not validate the same artifact shapes. Fixture-specific JSON-LD regressions can slip through both default paths.

Action:

Run `check:structured-data` after both empty-content and fixture builds in CI, or split explicit scripts such as `check:structured-data:empty` and `check:structured-data:fixtures`. Update `pnpm verify` to mirror CI.

### P1. Add Browser/E2E Coverage

Evidence:

- No Playwright, Cypress, Puppeteer, browser-test config, or e2e script was found.
- `src/components/EmbeddedTool.astro` contains inline client behavior: enabling a disabled button, writing to `localStorage`, updating aria-live text, and handling storage failures.
- Existing embed tests mostly validate contract data and source-string mounting, not real DOM execution.

Why it matters:

Astro build and Vitest tests do not prove browser behavior, fallback rendering, navigation, public route output, or layout-critical client flows.

Action:

Add a small Playwright gate against `astro preview` after fixture build. Cover `/predictions/calibration`, the local record flow, no-JS fallback, top navigation, and at least one `/api/*.json` endpoint.

### P1. Fix Stale LLM Provider Wiring In CI And Env Docs

Evidence:

- `.github/workflows/ci.yml` tells operators to configure `ANTHROPIC_API_KEY` and passes that secret to `pnpm brain-diff`.
- The active LLM layer uses `OPENAI_API_KEY` by default or `OLLAMA_API_KEY` when `LLM_PROVIDER=ollama`.
- `.env.example` still documents `ANTHROPIC_API_KEY` for CI brain-diff.

Why it matters:

Brain-diff can silently fall back to unscored output while CI still passes and uploads feeds.

Action:

Update CI and env docs to the provider abstraction. Use `OPENAI_API_KEY` or explicit `LLM_PROVIDER`/provider-specific secrets. Consider failing the brain-diff job, or marking artifacts clearly, when scoring is unavailable in CI.

## Priority 2 Action Items

### P2. Make Feed Publication Match Public Surface Claims

Evidence:

- `public/llms.txt` lists `/feed/brain-diff.xml`, `/feed/brain-diff.json`, `/feed/predictions-resolved.json`, `/feed/claims-revised.json`, and `/feed/decisions-reversed.json`.
- The normal site build does not generate these files.
- CI currently uploads `public/feed/` as an artifact and comments say deployment is future work.

Action:

Either generate feeds as part of the deployable site build or remove/mark those surfaces as artifact-backed until they are actually published.

### P2. Introduce An Agent/Proposal Registry

Evidence:

- Proposal sources/types are declared as TypeScript unions and repeated in Zod enums in `src/lib/proposal-queue.ts`.
- `scripts/review-proposals.ts` repeats source filters and side-effect imports each agent handler manually.
- Docs require several edits to add a new agent.

Action:

Introduce an `AGENT_REGISTRY` with source id, proposal types, handler module, CLI metadata, state files, and schedule metadata. Derive queue schemas, CLI filters, handler registration, and docs tables from it.

### P2. Make Proposal Handlers Repo-Root Explicit

Evidence:

- `runProposalsReview` accepts `cwd`.
- Several handlers still write rejection/submission state using `process.cwd()`.

Action:

Pass a handler context `{ cwd }` through `ProposalHandler.apply/edit/reject`, or persist repo root/source root in queued proposals.

### P2. Extract Shared Astro Route Primitives Judiciously

Evidence:

- Detail pages repeat `getCollection`, `getStaticPaths`, `render`, metadata fields, and related-link sections.
- Listing pages repeat similar sorting/listing patterns.
- Relation metadata lives in schemas, pages, and index edge metadata.

Action:

Add small helpers/components such as `getKindStaticPaths(kind)`, `RelatedRefs.astro`, `CollectionList.astro`, and `formatDate()`. Avoid a single generic detail renderer; keep per-kind sections where they carry real domain value.

### P2. Add API Route Contract Tests

Evidence:

- Collection API handlers delegate through `src/lib/api.ts`.
- `src/pages/api/embed/[id].json.ts` has path, 404, and content-type behavior.
- No tests directly invoke route handlers or validate built `/api/*.json` output.

Action:

Add route-level tests for response headers, body shape, empty collection behavior, known embed payloads, and embed 404. Include one built-endpoint fetch in e2e.

### P2. Replace Superficial Tests With Behavioral Tests

Evidence:

- Some `derive-claims` tests assert generic JavaScript/Zod behavior instead of production behavior in `proposeClaimsForThought`.

Action:

Mock `runToolCall` and test valid proposal mapping, null-result fallback, schema rejection, model propagation, prompt inclusion of existing claims, and max proposal behavior.

### P2. Refresh README, MCP Docs, Launchd Docs, And `llms.txt`

Evidence:

- `README.md` points to a private `~/.claude/plans/...` path and says the MCP server is later/future.
- MCP docs omit live resources such as `thinkinglabs://provenance` and `thinkinglabs://ai/current-models`.
- `scripts/launchd/README.md` says only `__REPO_ROOT__` must be replaced, but plist log paths hardcode `/Users/tom/...`.
- `scripts/build-llms-txt.ts` hardcodes `https://github.com/tom/thinkinglabs`, while the checked-out remote is `flaming-codes/thinkinglabs`.

Action:

Move roadmap/runbook content into tracked docs or remove the private pointer. Add an MCP resource/tool table that distinguishes public read-only resources, local write/intake tools, and model/provenance resources. Template log paths or document a `__LOG_DIR__` replacement. Derive the source URL from package/repo config or correct the canonical URL.

## Priority 3 Action Items

### P3. Reduce CLI Wrapper Duplication

Evidence:

Multiple scripts duplicate `--cwd`, `--no-llm`, numeric parsing, LLM fallback, and `main().catch` handling.

Action:

Add a small `src/lib/cli.ts` with option specs, shared parsers, `resolveLlmMode(agentName)`, and `runMain(main)`.

### P3. Validate Markdown After All Human Edits

Evidence:

Some handlers validate frontmatter after editor changes, while freshness-review can write edited markdown without post-schema validation.

Action:

Add a shared `editMarkdownWithSchema(kind, path)` helper and use it in every proposal handler that writes markdown.

### P3. Clarify ADR History Versus Current State

Evidence:

ADRs contain milestone language such as M2/M3/M5/M6/M7, "future MCP server", and provider migration notes.

Action:

Keep ADR history intact, but add short "Current state" notes where implementation has moved on. Prioritize MCP, background agents, LLM provider migration, and feed deployment language.

### P3. Make Git-Dependent Test Preconditions Explicit

Evidence:

Several integration tests skip or degrade when git is unavailable.

Action:

Make CI fail early if git is unavailable, or split a required `test:integration` gate with explicit prerequisites.

## Strong Existing Design Choices

- Schema-first content modeling with Zod.
- Deterministic SQLite index builder with source content as the canonical store.
- Generic JSON collection endpoint factory.
- LLM access centralized behind `src/lib/llm.ts`.
- Proposal queue and dispatcher pattern for unattended agents.
- Tests around deterministic clocks, queue idempotency, stale lock recovery, review CLI IO injection, freshness, calibration, and MCP handler behavior.

## Recommended Execution Order

1. Fix CI/env/feed/docs drift: LLM secrets, structured-data gates, README, feed claims.
2. Fix real behavior divergence: MCP calibration and MCP/public kind inventory.
3. Build a typed content repository and migrate agents off raw `walkMarkdown`.
4. Add Playwright e2e coverage for the calibration embed, fallback behavior, navigation, and JSON endpoint smoke.
5. Introduce kind/surface and agent/proposal registries after the immediate divergences are fixed.
6. Refactor repeated Astro route and CLI patterns opportunistically, keeping abstractions small.
