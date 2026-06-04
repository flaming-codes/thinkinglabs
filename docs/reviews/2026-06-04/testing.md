# Testing & Quality-Gates Review -- Thinking Labs (2026-06-04)

**Reviewer:** Testing  
**Branch:** feat-design-v2 @ 1e73fd0

---

## Executive summary

The test suite is unusually mature for a personal-knowledge repo. Every critical agentic pipeline -- the five background agents, the proposal/dispatch/review round-trip, the LLM choke-point, the MCP stdio transport, frontmatter parsing, the index builder, and the calibration engine -- is covered with well-structured, isolated unit tests and targeted integration tests. The `io`/PassThrough seam mandated by ADR-008 is properly wired in both `review-cli.test.ts` and the integration tests. The three most significant gaps are: (1) the HTTP MCP transport (`servers/thinkinglabs-mcp-http/`) has zero tests despite containing non-trivial security logic (DNS-rebinding protection, rate-limiting, CORS); (2) `src/lib/structured-data.ts` (566 lines, Schema.org graph builder) has no unit coverage, relying solely on a build-time CLI check that requires a fully-built `dist/`; and (3) no CI workflow file exists in `.github/`, so quality gates run only locally. Overall testing health: **Good** -- broad coverage of the business-critical paths with genuine integration depth, held back by the HTTP server and structured-data blind spots.

**Rough coverage impression:** ~75-80% of src/lib by module count, with the untested modules concentrated in the large, complex structured-data.ts and the new HTTP transport layer.

---

## Coverage map

| Module / Area                                                     | Tested?                                                               | Risk if untested |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------- |
| `src/lib/agents/dormant-flip.ts`                                  | Yes (unit + handler + integration)                                    | Low              |
| `src/lib/agents/freshness-review.ts`                              | Yes (unit + handler + integration)                                    | Low              |
| `src/lib/agents/resolve-predictions.ts`                           | Yes (unit + handler)                                                  | Low              |
| `src/lib/agents/review-decisions.ts`                              | Yes (unit + handler)                                                  | Low              |
| `src/lib/agents/triage-questions.ts`                              | Yes (unit, 7 cases)                                                   | Low              |
| `src/lib/proposal-queue.ts`                                       | Yes (9 cases incl. stale-lock recovery)                               | Low              |
| `src/lib/proposal-dispatch.ts`                                    | Yes (4 cases)                                                         | Low              |
| `src/lib/proposal-review-state.ts`                                | Partial (exercised via integration tests only)                        | Medium           |
| `src/lib/proposal-rejections.ts`                                  | No direct test                                                        | Medium           |
| `src/lib/review-cli.ts`                                           | Yes (4 cases, PassThrough seam used)                                  | Low              |
| `src/lib/llm.ts`                                                  | Yes (14 cases, both providers, timeout)                               | Low              |
| `src/lib/frontmatter.ts` + `frontmatter-parse.ts`                 | Yes (5 cases incl. malformed YAML)                                    | Low              |
| `src/lib/frontmatter-errors.ts`                                   | Partial (via content-repo tests)                                      | Low              |
| `src/index/builder.ts`                                            | Yes (determinism + malformed error path)                              | Low              |
| `src/lib/content-repo.ts`                                         | Yes (9 cases incl. safe/error path)                                   | Low              |
| `src/lib/structured-data.ts` (566 lines)                          | **No**                                                                | **High**         |
| `src/lib/brain-diff.ts`                                           | Yes (classify, predicates, formatters, BUILD_NOW_ISO)                 | Low              |
| `src/lib/brain-diff-score.ts`                                     | Exercised via brain-diff.test.ts (partial)                            | Medium           |
| `src/lib/calibration.ts`                                          | Yes (4 cases)                                                         | Low              |
| `src/lib/calibration-cross-surface.test.ts`                       | Yes                                                                   | Low              |
| `src/lib/og-image-cache.ts`                                       | Yes (5 cases)                                                         | Low              |
| `src/lib/seo.ts`                                                  | Yes (4 cases)                                                         | Low              |
| `src/lib/backlinks.ts`                                            | Yes                                                                   | Low              |
| `src/lib/body-append.ts`                                          | Yes                                                                   | Low              |
| `src/lib/network-graph.ts`                                        | Yes                                                                   | Low              |
| `src/lib/network-graph-layout.ts`                                 | No direct test                                                        | Low              |
| `src/lib/claim-history.ts`                                        | Yes                                                                   | Low              |
| `src/lib/freshness.ts`                                            | Yes                                                                   | Low              |
| `src/lib/section-stamps.ts`                                       | Yes                                                                   | Low              |
| `src/lib/markdown-routes.ts`                                      | Yes (650 lines, covered by markdown-routes.test.ts)                   | Low              |
| `src/lib/surfaces.ts`                                             | Partial (surfaces.test.ts checks inventory invariants)                | Low              |
| `src/lib/registry.ts` (444 lines)                                 | Partial (used as fixture in other tests, no direct unit)              | Medium           |
| `src/lib/derive-claims.ts`                                        | Yes (unit + integration)                                              | Low              |
| `src/lib/review-stale-claims.ts`                                  | Yes (unit + integration)                                              | Low              |
| `src/lib/editor.ts`                                               | Yes                                                                   | Low              |
| `src/lib/json-state.ts`                                           | Yes                                                                   | Low              |
| `src/lib/provenance.ts`                                           | Yes                                                                   | Low              |
| `src/lib/linkedin-post.ts`                                        | Yes                                                                   | Low              |
| `src/lib/contact.ts`                                              | No unit test (covered indirectly via MCP handler tests)               | Low              |
| `src/lib/git.ts`                                                  | No unit test (used by integration tests)                              | Medium           |
| `src/lib/clock.ts`                                                | Yes                                                                   | Low              |
| `src/lib/site.ts`                                                 | No direct test                                                        | Low              |
| `src/lib/env.ts`                                                  | No direct test                                                        | Low              |
| `src/lib/sort.ts`                                                 | No direct test                                                        | Low              |
| `src/lib/refs.ts`                                                 | No direct test                                                        | Low              |
| `src/lib/route-helpers.ts`                                        | No direct test                                                        | Low              |
| `src/lib/entity-routes.ts`                                        | No direct test                                                        | Low              |
| `src/lib/decisions.ts`                                            | No direct test                                                        | Low              |
| `src/lib/projects.ts`                                             | No direct test                                                        | Low              |
| `src/lib/agent-registry.ts`                                       | No direct test                                                        | Low              |
| `src/lib/thinkinglabs-ui.ts` (1566 lines)                         | Partial (thinkinglabs-ui.test.ts + ui-routes + design-tokens)         | Medium           |
| `src/lib/css-tokens.ts`                                           | Exercised via design-tokens.test.ts                                   | Low              |
| `src/lib/api.ts`                                                  | Yes (unit via collection-json.test.ts)                                | Low              |
| `src/markdown/remark-section-freshness.ts`                        | Yes                                                                   | Low              |
| `src/markdown/rehype-section-freshness.ts`                        | Partial (remark test covers the pipeline)                             | Low              |
| `src/schemas/*.ts`                                                | Partial (exercised via round-trip tests, no direct schema unit tests) | Medium           |
| `servers/thinkinglabs-mcp/server.ts` + `handlers.ts` + `store.ts` | Yes (handlers.test.ts, full SDK round-trip)                           | Low              |
| `servers/thinkinglabs-mcp-http/server.ts`                         | **No**                                                                | **High**         |
| `servers/thinkinglabs-mcp-http/rate-limit.ts`                     | **No**                                                                | **High**         |
| `scripts/build-feeds.ts`                                          | Yes                                                                   | Low              |
| `scripts/check-structured-data.ts`                                | No unit test (runs at build time only)                                | Medium           |
| `scripts/brain-diff.ts` (CLI wrapper)                             | Integration test only                                                 | Low              |
| `scripts/review-proposals.ts`                                     | Yes (integration round-trip)                                          | Low              |
| `scripts/derive-claims.ts`                                        | Yes (integration)                                                     | Low              |
| OG image generation (`src/pages/og/[...slug].png.ts`)             | No unit test                                                          | Medium           |

---

## Scope & method

Static analysis only: no builds or test runs were executed. All findings are based on reading test files, source files, the package.json script definitions, and the playwright config. Line numbers reference the current branch. The reviewer enumerated all 58 `src/lib/` files, all `servers/**` files, and all `scripts/**` files against the `tests/` directory to construct the coverage map.

---

## Findings

### [High] HTTP MCP transport has zero test coverage

**Location:** `servers/thinkinglabs-mcp-http/server.ts` (278 lines), `servers/thinkinglabs-mcp-http/rate-limit.ts` (66 lines)

**Observation:** The HTTP transport is the internet-facing surface of the MCP server. It implements: DNS-rebinding protection via `allowedHosts` and `allowedOrigins` checks (lines 116-123, 172-177), CORS headers (lines 190-213), a token-bucket rate limiter (line 157), a 1 MiB body cap (lines 218-238), and a 30-second request timeout (line 78). None of these code paths have any test. The `createTokenBucket` function in `rate-limit.ts` is also completely untested. The `handlers.test.ts` file covers the stdio transport only via `InMemoryTransport`, never instantiating `startMcpHttpServer`.

**Impact:** A bug in the host-allowlist check, the CORS logic, or the rate-limit refill math could allow DNS-rebinding attacks or request flooding in a deployed context. The security properties are stated in `docs/agents/mcp-http-server.md` but not verified by any automated test.

**Recommendation:** Add a unit test file `tests/thinkinglabs-mcp-http/server.test.ts` that (a) spins up `startMcpHttpServer` on a random port, (b) asserts that requests with disallowed `Host` headers receive 403, (c) confirms rate-limiting throttles at the configured burst, (d) checks that an oversized body returns 400, and (e) verifies the `/healthz` probe. Add a separate `rate-limit.test.ts` that directly exercises `createTokenBucket` with a fake `Date.now` tick to verify burst and refill.

**Effort:** M

---

### [High] `src/lib/structured-data.ts` (566 lines) has no unit tests

**Location:** `src/lib/structured-data.ts:54-end`

**Observation:** `buildPageGraph`, `canonicalUrl`, and the per-kind graph builders (`buildPostGraph`, `buildClaimGraph`, etc.) produce the JSON-LD markup embedded in every rendered HTML page. Their correctness is checked only by `scripts/check-structured-data.ts`, which parses the built `dist/` and applies basic structural assertions. That script runs as a separate `verify` step and requires a full build; it cannot be run in isolation and gives no unit-level visibility into the node-building logic.

**Impact:** A regression in, say, `buildClaimGraph` (confidence node, evidence array) would not be caught until a full site build, and even then only by the broad structural checks in `check-structured-data.ts` (which asserts type presence, not field values). The `canonicalUrl` function (line 54) has no test for its edge cases (trailing slashes, hash stripping, relative paths).

**Recommendation:** Add `tests/structured-data.test.ts` covering `canonicalUrl` edge cases, `buildPageGraph` minimum graph shape, and at least two per-kind builders (e.g., `buildPostGraph`, `buildClaimGraph`) asserting the presence and type of key JSON-LD fields.

**Effort:** M

---

### [High] No CI workflow -- quality gates are local-only

**Location:** `.github/` directory contains only `copilot-instructions.md` and skill definitions; no `*.yml` or `*.yaml` workflow files.

**Observation:** The `verify` and `verify:full` scripts exist in `package.json` but there is no automated CI pipeline to run them on pull requests or pushes. The branch `feat-design-v2` has no gate that would block a merge if tests, typecheck, or the structured-data check fail.

**Impact:** Any contributor (human or agent) can commit broken code. The absence of CI also means the E2E Playwright suite (`verify:full`) is never exercised automatically against the built site.

**Recommendation:** Add `.github/workflows/ci.yml` that runs `pnpm verify` on push and pull_request to `main`, and optionally `pnpm verify:full` on a schedule or on demand. The frozen-now env vars (`BUILD_NOW_ISO`, `FRESHNESS_NOW_ISO`) should be set in the workflow to ensure test determinism. The `pnpm lint` step is notably absent from `verify` (see finding below) and should be added there first.

**Effort:** S

---

### [Medium] `pnpm lint` is not part of `pnpm verify`

**Location:** `package.json` scripts section

**Observation:** The `verify` script is defined as `pnpm clean && pnpm typecheck && pnpm check && pnpm build && pnpm check:structured-data && pnpm test`. It includes `pnpm check` (Vite+) and `pnpm typecheck` (Astro) but not `pnpm lint` (Oxlint). Lint is a separate command that must be run manually.

**Impact:** Lint violations can accumulate silently. Because there is no CI (see previous finding), a linting regression will never be caught automatically.

**Recommendation:** Add `pnpm lint` to the `verify` script, between `pnpm check` and `pnpm build`. Given that the comment-lint test (`tests/comment-lint.test.ts`) already enforces JSDoc rules via TypeScript AST, the addition of Oxlint to `verify` is a straightforward gap.

**Effort:** S (one-line change)

---

### [Medium] No coverage threshold configured

**Location:** No `vitest.config.ts` or coverage block found in any project-level config.

**Observation:** Vitest is invoked via Vite+ (`vp test run`) but no `coverage` configuration with thresholds was found. There is no `--coverage` flag in the `test` script, meaning coverage is never measured or enforced.

**Impact:** Coverage gaps like the ones identified above can grow silently. Without a threshold, the test count can plateau while the codebase grows.

**Recommendation:** Configure coverage in `vite.config.ts` (or `vitest.config.ts`) with at least a per-file line/branch threshold. Start conservatively (e.g., 60%) and raise it incrementally. The `src/lib/structured-data.ts` and HTTP transport gaps would immediately appear in a coverage report.

**Effort:** S

---

### [Medium] OG image generation route has no test coverage

**Location:** `src/pages/og/[...slug].png.ts` (referenced in `check-structured-data.ts`; no test file found)

**Observation:** The OG image generation pipeline -- which is exercised at build time for every content page -- is not tested at the unit level. The `og-image-cache.ts` module is well-tested, but the rendering logic (Satori/Resvg call, font loading, hero asset import, slot selection) has no test.

**Impact:** A regression in the render function (e.g., a changed import path for a font, a broken layout slot) would only surface during `astro build`, after potentially long build times.

**Recommendation:** At minimum, add a smoke test that calls the render function with a fixture `EntryMeta` and asserts that the returned `Uint8Array` is a valid PNG (starts with `\x89PNG`). The existing `og-image-cache.test.ts` fixture infrastructure can be reused.

**Effort:** M

---

### [Medium] `proposal-review-state.ts` and `proposal-rejections.ts` have no direct unit tests

**Location:** `src/lib/proposal-review-state.ts` (155 lines), `src/lib/proposal-rejections.ts`

**Observation:** `proposal-review-state.ts` manages the state-machine transitions (pending -> accepting -> applying -> applied -> finalized) that guard replay safety. It is exercised only via the integration tests in `tests/agents/review-proposals.integration.test.ts` and `tests/review-proposals.integration.test.ts`. The state-machine edge cases (invalid transition, concurrent-write protection) are tested there but indirectly. `proposal-rejections.ts` (per-agent rejection memory) has no tests at all.

**Impact:** A regression in the state-machine transition logic could cause duplicate apply() calls or silently drop proposals. The integration tests catch the "applying phase" guard (line 247 of `review-proposals.integration.test.ts`) but not all transition paths.

**Recommendation:** Add direct unit tests for `proposal-review-state.ts` covering each valid and invalid transition, and for `proposal-rejections.ts` covering the add/check/persist cycle.

**Effort:** S

---

### [Medium] `src/lib/thinkinglabs-ui.ts` (1566 lines) is only partially tested

**Location:** `src/lib/thinkinglabs-ui.ts`

**Observation:** This is the largest file in `src/lib/` by line count. `tests/thinkinglabs-ui.test.ts` and `tests/thinkinglabs-ui-routes.test.ts` exist but their scope was not exhaustively verified. The file likely contains route mapping, component prop derivation, and palette/shader logic used across all detail pages.

**Impact:** Regressions in the UI route or prop derivation logic could silently break detail page rendering without failing any unit test.

**Recommendation:** Audit the test coverage of `thinkinglabs-ui.ts` and add tests for any untested export, especially palette selection and metadata derivation helpers.

**Effort:** M

---

### [Low] E2E `client-router-styles.spec.ts` hard-codes a real content slug

**Location:** `tests/e2e/client-router-styles.spec.ts:18`

**Observation:** The test clicks the link with text `"The agent harness is the new IDE"` and then asserts a specific URL pattern. This hard-codes the existence and title of a specific thought entry.

**Impact:** If that thought is renamed or removed, the E2E test fails with a locator error rather than a meaningful assertion failure. It is also a mild coupling between the test and live content.

**Recommendation:** Either add a `data-testid` attribute to a guaranteed-present thought, or select the first available link in the listing and assert only the structural properties (styles, heading visibility), not the specific slug.

**Effort:** S

---

### [Low] `home-mobile.spec.ts` hard-codes landing card copy strings

**Location:** `tests/e2e/home-mobile.spec.ts:4-14`

**Observation:** Nine landing card copy strings are duplicated verbatim from the component source. If any card's copy is updated, the test breaks without warning.

**Impact:** Low -- copy drift is detectable at code-review time. But the test adds a maintenance tax on every copy edit.

**Recommendation:** Consider asserting card count and that each card has non-empty visible text, rather than matching exact strings. Or keep the strings but co-locate them with the component source so a single update covers both.

**Effort:** S

---

### [Low] `brain-diff.test.ts` tests `BUILD_NOW_ISO` handling but not `FRESHNESS_NOW_ISO`

**Location:** `tests/brain-diff.test.ts:183-195`

**Observation:** The test covers `BUILD_NOW_ISO` but the FRESHNESS_NOW_ISO env var (used in freshness agent scheduling) is not directly tested in the clock module tests.

**Impact:** Very low -- `clock.ts` is tested and `FRESHNESS_NOW_ISO` is a documented variant. But a future maintainer adding a new clock consumer might not realize the env var exists.

**Recommendation:** Add a `clock.test.ts` case that verifies `FRESHNESS_NOW_ISO` is also honored (in addition to `BUILD_NOW_ISO`).

**Effort:** S

---

### [Info] No Vitest inline snapshots or overused toMatchSnapshot calls

**Observation:** The test suite uses zero `toMatchSnapshot` or `toMatchInlineSnapshot` calls. All assertions are explicit value checks. This is excellent practice for a codebase with deterministic outputs.

---

### [Info] `check:structured-data` requires a full build and is not parallelizable

**Location:** `scripts/check-structured-data.ts`

**Observation:** The structured-data check requires `dist/` to exist. It cannot run in isolation without a full `astro build`. This means it adds ~60-120 seconds to the `verify` cycle. Because it is a shell script rather than a unit test, it also cannot be run selectively (e.g., `pnpm test -- tests/structured-data.test.ts`).

**Recommendation:** Splitting the pure logic (JSON-LD graph validation) into unit tests (see High finding above) would remove the dependency on a full build for most checks, while keeping `check:structured-data` as an integration smoke test.

**Effort:** M

---

## Quick wins (ranked by value/effort)

1. **Add `.github/workflows/ci.yml`** -- run `pnpm verify` on PR. Zero code change; immediately catches regressions before merge. (S)
2. **Add `pnpm lint` to `verify`** -- one-line package.json change; closes a silent gap. (S)
3. **Add `tests/thinkinglabs-mcp-http/rate-limit.test.ts`** -- directly test `createTokenBucket` burst/refill with a fake clock. Isolated, no server setup needed. (S)
4. **Add `proposal-review-state` unit tests** -- cover state-machine transitions directly; currently only integration-tested. (S)
5. **Add coverage for `canonicalUrl` in `structured-data.ts`** -- the simplest part of the untested module; a single test file with 6-8 cases gives immediate visibility. (S)

---

## Larger test investments (ranked by value)

1. **`tests/thinkinglabs-mcp-http/server.test.ts`** -- full HTTP transport test with host-allowlist, rate-limit throttle, body-cap, and healthz assertions. Requires spinning up the `startMcpHttpServer` against a random port. (M)
2. **`tests/structured-data.test.ts`** -- per-kind JSON-LD graph unit tests for `buildPostGraph`, `buildClaimGraph`, `buildPredictionGraph`. (M)
3. **OG image render smoke test** -- call the render function with a minimal fixture and assert valid PNG bytes. Requires either a lightweight Satori mock or a small real render with a minimal font subset. (M-L)
4. **Coverage threshold configuration** -- add a `coverage` block to the Vite+ config; a 60% initial line threshold would fail immediately on the known gaps and serve as a regression floor. (S for config, L for gap remediation)

---

## What's already good (keep)

- **`io`/PassThrough seam** is properly implemented in `review-cli.ts` and correctly used across all agent tests and integration tests. This was the ADR-008 mandate and it is honored without exception.
- **Frozen-now determinism** -- `BUILD_NOW_ISO` is used consistently in `clock.ts`, `brain-diff.test.ts`, `dormant-flip.test.ts`, and the integration tests. No test relies on `Date.now()` for assertion logic (only `clock.test.ts` uses it to bracket a time range for the unfrozen path, which is correct).
- **No snapshots** -- zero `toMatchSnapshot` usage across the entire test suite. All assertions are explicit and brittle-resistant.
- **Full proposal pipeline round-trip** -- `tests/agents/review-proposals.integration.test.ts` covers accept, dry-run preservation, replay-guard, and in-flight phase detection with a real git repo. This is exemplary integration test design.
- **MCP handler tests are deep** -- `tests/thinkinglabs-mcp/handlers.test.ts` covers the full SDK round-trip via `InMemoryTransport`, path-traversal slug rejection (7 variants), pagination overflow, and the source-vs-sqlite fallback. The test fixture construction is realistic.
- **`pnpm verify` is well-scoped** -- the sequence (clean, typecheck, check, build, structured-data, test) is comprehensive for a static site and catches frontmatter schema regressions at build time via `astro check && astro build`.
- **Fixture realism** -- test helper functions (`writeMd`, `writeProject`, `writePost`, etc.) produce valid frontmatter that matches the Zod schemas, ensuring tests fail on real schema issues, not on test fixture bugs.
- **Comment-lint as a test** -- `tests/comment-lint.test.ts` enforces JSDoc standards across the entire source tree via TypeScript AST. This is an unconventional but effective technique.
- **`proposalId` determinism test** -- `tests/proposal-queue.test.ts:92-124` directly verifies the SHA-256 determinism contract including key-order independence of the payload. This is exactly the kind of test ADR-008 implies.

---

## Open questions for the maintainer

1. **HTTP server deployment plans** -- If `servers/thinkinglabs-mcp-http/` is intended to be deployed publicly in the near term, the lack of any HTTP transport tests becomes Critical rather than High. What is the deployment timeline?

2. **Coverage measurement** -- Has coverage ever been measured on this codebase? The lack of a `coverage` script in `package.json` and no threshold config suggests it has not been a priority. Is there a reason to not configure it (e.g., Vite+ coverage support limitations)?

3. **CI intent** -- Was CI omitted intentionally (single-developer repo, fast local iteration) or is it a gap? The `forbidOnly: !!process.env["CI"]` in `playwright.config.ts:8` implies CI is anticipated.

4. **`rehype-section-freshness.ts` coverage** -- `remark-section-freshness.test.ts` exists but does it also cover the rehype plugin, or only the remark pass? If the rehype plugin has separate logic, it may need its own test.

5. **`src/lib/thinkinglabs-ui.ts` scope** -- At 1566 lines, this is the largest file in the lib. Is it intentionally monolithic, or is a split planned? A large untested surface in a file this size warrants either splitting (testable units) or explicit coverage effort.
