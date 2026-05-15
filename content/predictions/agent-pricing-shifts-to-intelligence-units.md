---
prediction: "By 2027-11-15, at least one major AI platform will price off-the-shelf or rentable agents using an opaque blended unit such as credits, intelligence units, or agent capacity, where the customer-facing meter combines model choice, token use, tool calls, data access, execution speed, and runtime rather than exposing tokens or wall-clock time as the primary billable unit."
made: 2026-05-15
resolves: 2027-11-15
confidence: 0.58
resolution: pending
resolved_on: null
resolution_note: null
evidence_at_time:
  - thoughts/agent-harnesses-will-move-onto-the-shelf
  - inputs/anthropic-claude-managed-agents
  - inputs/openai-workspace-agents-chatgpt
tags:
  - agents
  - pricing
  - marketplaces
---

This is a pricing corollary of the [rentable agent harnesses prediction](/predictions/rentable-agent-harnesses-become-available). If agents become off-the-shelf work units, the platform has an incentive to hide the mechanical bill of materials behind a product-shaped meter. The user does not want to choose between token buckets, tool-call prices, database query costs, model latency tiers, frontier-model surcharges, and execution runtime before asking for work. They want to spend some amount of capability.

"Opaque blended unit" does not require the provider to literally use the word "intelligence." Credits, capacity, agent units, or another branded meter qualify if the public pricing page makes that unit the main thing a customer buys or spends, and if that unit clearly abstracts over several underlying cost drivers. A normal/fast/deep mode toggle can count as part of the blended unit if it affects the price or burn rate.

Resolve true if a major AI platform publicly prices preconfigured or rentable agents this way by the resolution date. Resolve false if agent pricing remains primarily transparent pass-through pricing for tokens, wall-clock execution time, individual tool calls, or fixed subscriptions without a metered agent-consumption unit. Resolve ambiguous if providers use blended internal accounting but do not expose it clearly enough for customers to understand that agent work is being charged through a combined unit.
