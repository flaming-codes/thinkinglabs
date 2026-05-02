# ADR-009 — Proposal/confirmation pattern for unattended agents

- **Status**: Accepted
- **Date**: 2026-04-30
- **Supersedes**: —
- **Superseded by**: —

## Context

Five background agents landed in M5: `dormant-flip`, `review-decisions`, `resolve-predictions`, `freshness-review`, and `triage-questions`. Each scans a content collection and generates mutations — flipping a project dormant, surfacing an overdue decision, resolving a prediction, restamping a stale post section, curating a reader answer. ADR-001 forbids unreviewed source-tree mutation. An agent that writes directly violates that principle; one that waits for a TTY cannot run unattended. The proposal/confirmation pattern resolves the tension.

## Decision

Agents emit typed `QueuedProposal` objects into `.proposal-queue.json` at the repo root; they never touch `content/` directly. `proposalId(source, type, target, payload)` computes a deterministic SHA-256 key: agents re-running over unchanged content produce the same ids and deduplicate naturally. `enqueue` is idempotent on duplicate ids.

`ProposalHandler` implementations register at module-import time via `registerHandler` in `src/lib/proposal-dispatch.ts`, keyed by `ProposalType`. The unified `scripts/review-proposals.ts` CLI imports all five agent modules (triggering handler registration), drains the queue interactively using `runReview` (ADR-008), and applies accepted mutations via each handler's `apply` or `edit` method. `review-proposals` blocks on TTY input and must never be scheduled. The agent CLIs (`scripts/<agent>.ts`) are the schedulable surface; `review-proposals` is their human-driven complement — the two halves of the pattern.

Per-agent rejection memory lives in `.<agent>-rejections.json` files at the repo root, all gitignored. The optional `reject` hook records a snapshot of the relevant identity field so the same proposal is not re-enqueued unless the underlying content changes. `freshness-review` is the exception: its reject hook is a no-op. Staleness is continuous rather than event-driven; rejection memory would suppress accurate flags, so "reject" deliberately means "not now", not "never".

`dormant-flip` and `review-decisions` are pure deterministic scanners with no SDK dependency. `resolve-predictions`, `freshness-review`, and `triage-questions` call `runToolCall` (the M4.5 SDK choke-point) behind a `skipLLM` flag. When `OPENAI_API_KEY` is absent the CLI sets `skipLLM = true` and produces zero proposals — scan logic runs, LLM calls do not.

**Scheduling: launchd, not CI cron.** State files live in the repo working tree and are gitignored. A CI clean checkout resets them on every run, causing rejected proposals to recur indefinitely. launchd preserves the working tree between invocations, keeping rejection memory intact. LLM-mediated agents additionally require `OPENAI_API_KEY` locally. The CI workflow (build, typecheck, tests, brain-diff) is unaffected; agents are not CI concerns.

## Consequences

Every agent scan is idempotent and non-destructive. The queue accumulates until the human runs `review-proposals`; pending proposals survive restarts. Adding a new agent requires a module in `src/lib/agents/`, a CLI in `scripts/`, a `pnpm` script, an import in `scripts/review-proposals.ts`, and optionally a launchd plist — no changes to the queue, dispatch, or review-cli primitives.

## Caveats

- `freshness-review` does not persist rejections. "Reject" means "not now", not "never".
- State files are local-only. Moving the repo resets rejection memory; rejected proposals may recur once.
- LLM agents fall back to `--no-llm` (zero proposals) when `OPENAI_API_KEY` is absent.

## Alternatives considered

CI cron was rejected because gitignored state files are wiped on every clean checkout, defeating rejection memory. Running only the two non-LLM agents in CI was rejected because mixing CI and launchd adds complexity without benefit. A central rejection store was rejected because per-agent files give independent rejection semantics; `freshness-review`'s no-op rejection is harder to model in a shared schema.

### Current state (2026-05-02)

All five agents ship in `src/lib/agents/` with CLIs in `scripts/` and launchd plist templates in `scripts/launchd/`. The plists use both `__REPO_ROOT__` and `__LOG_DIR__` placeholders that operators substitute at install time (see `scripts/launchd/README.md`). The LLM-mediated agents key off `OPENAI_API_KEY` (or `OLLAMA_API_KEY` when `LLM_PROVIDER=ollama`) — the M6 provider migration replaced the original Anthropic key reference; see ADR-007's current-state note. `pnpm review-proposals` is the human drain.
