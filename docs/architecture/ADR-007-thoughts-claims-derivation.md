# ADR-007 — Two-layer thoughts↔claims model and the derivation contract

- **Status**: Accepted
- **Date**: 2026-04-30
- **Supersedes**: —
- **Superseded by**: —

## Context

The knowledge system needs both prose fidelity and agent-queryable structure. A single prose layer leaves no machine-readable assertions — agents cannot filter by confidence or detect staleness without re-parsing free text on every query. A single claim-only layer is prohibitively expensive to author: every belief becomes a form-filling exercise, killing the low-friction capture that makes the system worth using.

## Decision

`thoughts/` is the rough-draft prose layer: free markdown body, minimal frontmatter, voice intact. `claims/` is the atomic structured layer: one file per claim, one-sentence assertion, confidence in [0,1], evidence, opposing views, `derived_from`, `last_reviewed`. The bidirectional link (`thought.claims` ↔ `claim.derived_from`) makes both layers jointly traversable.

The derivation contract: thoughts are written first, uncurated. Periodically, `scripts/derive-claims.ts` calls the LLM (OpenAI gpt-4.1, `tier: "balanced"` via `src/lib/llm.ts`) to propose 3–10 atomic claims per thought. The LLM proposes (claim text, confidence, evidence/opposing, slug, merge candidates); the human curates (accept/edit/reject/defer/merge). On accept or edit the claim is written to `content/claims/<slug>.md` and the source thought's `claims:` array is updated via `addClaimBacklink`. On reject, a stable hash of `(thoughtSlug, claimText)` is stored in `.derivation-rejections.json`; deferred proposals persist in `.derivation-deferrals.json` for replay. All three state files are gitignored. `.derivation-state.json` records `lastProcessedAt` per thought — a thought is not re-proposed unless its mtime advances past that timestamp.

Confidence is a moving target. The derivation pipeline seeds an initial value from the LLM's reading of the author's hedging. The stale-claim review pipeline (Slice C) re-surfaces claims whose `last_reviewed` has aged past a threshold for re-evaluation.

Accepted AI-assisted effects are recorded separately as generic provenance objects under `content/provenance/`. Domain objects such as claims keep only domain fields; provenance links source and target semantic ids and records the `ModelRef` (`provider`, `model`, `tier`) captured by the LLM choke-point. Provenance is committed alongside other content but is **not surfaced on the public web**: no listing route, no detail route, no JSON API. Local consumers (the MCP stdio server, agents reading `dist/index.sqlite`) still see it via `thinkinglabs://provenance`.

## Consequences

Agents query `claims/` without re-parsing prose. Authoring pressure stays on `thoughts/`, which is cheap. Claim confidence history is visible on `/claims/<slug>` via `walkFileHistory` + `parseClaimHistory` at render time.

## Caveats

**Manual YAML emitter**: `proposalToClaimFile` emits YAML by hand for deterministic key ordering — gray-matter's `stringify` ordering is non-stable across versions, polluting git diffs. String scalars are JSON-stringified for YAML safety. The emitter is intentionally narrow: it handles only the field types `claimSchema` produces.

**Merge action auto-pick**: `[m]erge` prints candidates and prompts for a slug but immediately uses `mergeCandidates[0]` without reading a response. When no candidates exist the merge silently skips. Deferred to a later UX pass; the `runReview` runtime does not thread `io` into action handlers (see ADR-008).

**`derived_from` canonical form**: pipeline-generated claims write `thoughts/<slug>` (no extension, no anchor). Hand-authored claims may include `.md` and `#anchor` suffixes. The renderer normalizes both via `stripMdExt` then `stripKindPrefix`.

**SDK choke-point** (resolved): `brain-diff-score.ts` and `derive-claims.ts` each instantiated their own LLM client; Slice C's `review-stale-claims` was the third caller, crossing the agreed extraction threshold. The M4.5 cleanup pass extracted a single choke-point, now at `src/lib/llm.ts` (Vercel AI SDK, OpenAI provider). All callers compose against `runToolCall`. The M6 refactor migrated from `@anthropic-ai/sdk` to `ai` + `@ai-sdk/openai`, replacing Anthropic model literals with a `ModelTier` abstraction (`"fast"` → gpt-4.1-mini, `"balanced"` → gpt-4.1). The provenance extension changed `runToolCall` to return `{ data, model }`, where `model` is the env-resolved `ModelRef` captured at call time. The active provider API-key guard means no network call is made when the key is absent; `--no-llm` paths remain SDK-free at the call-site level. Future callers compose against `runToolCall`.

## Alternatives considered

Auto-deriving claims at build time was rejected — it removes the human write gate. Storing claims inside thought frontmatter was rejected: no independent addressability, no per-claim history, no supersession chain. A claim-only system was rejected for authoring overhead.
