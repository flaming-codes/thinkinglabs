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
tags: [agents, proposals]
---

# Proposal confirmation workflows

Background agents should propose work, not mutate canonical content directly.
They enqueue typed proposals with deterministic IDs. `pnpm review-proposals`
loads registered handlers and applies accepted or edited mutations through the
handler contract.

New propose-then-curate workflows should reuse `runReview`, `editInEditor`, and
`patchFrontmatter` rather than implementing their own review loop.
