---
id: agents.proposals
title: Proposal confirmation workflows
desc: Background agents enqueue proposals and review-proposals applies accepted mutations.
status: active
owner: Tom Wild
audience: [agents, engineering]
last_verified: 2026-06-05
ttl_days: 180
layer: agents
code_refs:
  - file: src/lib/proposal-dispatch.ts
    symbol: registerHandler
    kind: function
    namespace: value
  - file: src/lib/review-cli.ts
    symbol: runReview
    kind: function
    namespace: value
  - file: src/lib/agent-registry.ts
    symbol: AGENT_REGISTRY
    kind: const
    namespace: value
  - file: src/lib/proposal-queue.ts
    symbol: proposalId
    kind: function
    namespace: value
  - file: scripts/review-proposals.ts
    symbol: runProposalsReview
    kind: function
    namespace: value
tags: [agents, proposals]
---

# Proposal confirmation workflows

Background agents should propose work, not mutate canonical content directly.
They enqueue typed proposals with deterministic IDs. `pnpm review-proposals`
loads registered handlers and applies accepted or edited mutations through the
handler contract.

Agent CLIs are schedulable; `pnpm review-proposals` is human-only and must not
be scheduled. Rejections persist in `.<agent>-rejections.json`, except
`freshness-review`, whose reject hook is deliberately a no-op. LLM agents use
`runToolCall` behind `skipLLM`; `--no-llm` or a missing provider key produces
zero proposals.

New propose-then-curate workflows should reuse `runReview`, `editInEditor`, and
`patchFrontmatter` rather than implementing their own review loop.

To add a proposal agent, update `src/lib/agent-registry.ts`, add the agent
module with `run<Agent>` and `registerHandler`, add a CLI in `scripts/`, add the
`pnpm` script, and optionally add a launchd plist. `review-proposals` imports
handler modules from `AGENT_REGISTRY`.
