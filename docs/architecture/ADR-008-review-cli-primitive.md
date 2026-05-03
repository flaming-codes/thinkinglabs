# ADR-008 — Shared review-CLI primitive

- **Status**: Accepted
- **Date**: 2026-04-30
- **Supersedes**: —
- **Superseded by**: —

## Context

Two pipelines already share the same skeleton: an LLM proposes items, a human steps through them one at a time, and the result is written to the content tree. `derive-claims` uses it for claim proposals; `review-stale-claims` uses it for staleness confirmations. Future M5 background agents will use it too. Without a shared primitive the keystroke loop, raw-mode guard, and test-injection seam are reimplemented and diverge.

## Decision

`src/lib/review-cli.ts` is the single keystroke-driven review runtime. It accepts typed proposals and typed actions; the vocabulary is per-consumer — `derive-claims` registers accept/edit/reject/defer/merge; `review-stale-claims` registers confirm/revise/deprecate/skip. The runtime owns: keystroke reading, raw-mode enable/disable, output, and an `io?: { input, output }` injection point so tests drive sessions via `PassThrough` streams without a real TTY.

`src/lib/editor.ts` (`editInEditor`) is the orthogonal primitive for cases where a keystroke is not enough: the reviewer opens `$EDITOR` and mutates content by hand. Both pipelines use it. It is separate from `runReview` because not every action needs an editor.

M5 background agents follow the same skeleton: `runReview` + `editInEditor` + `patchFrontmatter` (the Slice C extraction) for write-back. M5's ADR will reference this one as the foundation.

## Consequences

Any new propose-then-curate workflow inherits the loop and test harness for free. The runtime closes over nothing but `proposals` and `actions`; consumers close over their own state. The raw-mode/PassThrough boundary makes the same test-injection pattern work across all consumers.

## Caveats

**Raw-mode TTY guard**: `setRawMode` is called only when stdin exposes it (real TTY). `PassThrough` streams injected in tests skip it cleanly; piped stdin also skips it, degrading keystroke handling but not crashing.

**`io` does not reach action handlers**: `runReview` uses `io` for its own loop but does not thread it into `handle` callbacks. Consumers needing additional input inside an action must close over `process.stdin` directly or delegate to `editInEditor`. This is the root cause of the merge-picker limitation documented in ADR-007.

## Alternatives considered

Embedding the loop in each script was rejected — the raw-mode guard and test-injection seam are non-trivial and would diverge. A readline-based interface was rejected: readline adds line-buffering; single-keystroke dispatch needs raw mode or a one-byte read loop. An event-emitter design was rejected as over-engineered for a linear proposal list where ordering is always sequential.

### Current state (2026-05-02)

`runReview` (`src/lib/review-cli.ts`), `editInEditor` (`src/lib/editor.ts`), and `patchFrontmatter` (`src/lib/frontmatter.ts`) all ship as the foundation referenced above. M5 background agents compose against them through `scripts/review-proposals.ts`; see ADR-009. The merge-picker `io`-threading limitation noted in the caveat is unchanged — handlers still close over `process.stdin` directly or delegate to `editInEditor`.
