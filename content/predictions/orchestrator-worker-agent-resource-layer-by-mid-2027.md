---
prediction: "By 2027-06-30, a recognizable agent resource layer will exist in which user-facing orchestrator agents act as human-to-agent-to-agents interfaces and delegate work to specialized remote worker agents or harnesses through A2A, an A2A-compatible protocol, or a directly comparable agent-to-agent contract."
made: 2026-05-15
resolves: 2027-06-30
confidence: 0.6
resolution: pending
resolved_on: null
resolution_note: null
evidence_at_time:
  - thoughts/agent-harnesses-will-move-onto-the-shelf
  - inputs/a2a-agent2agent-protocol
  - inputs/haai-human-to-agent-to-agents-interface-working-term
  - inputs/anthropic-claude-managed-agents
  - inputs/openai-workspace-agents-chatgpt
tags:
  - agents
  - protocols
  - orchestration
  - harnesses
---

The prediction is that agent systems will grow a new resource layer between the user's primary agent and the growing sea of specialist agents. The shape is a chain into a graph: human to orchestrator agent to worker agents. At the border are orchestrator agents: OpenClaw, Claude running on a user's machine, a managed ChatGPT workspace agent, Gemini or Copilot in an enterprise surface, or some similar agent that is trusted to represent a person's intent. These orchestrators become the HAAI, the human-to-agent-to-agents interface, not because they do all the work, but because they hold the relationship with the human while routing work to other agents.

Inside the graph is the worker layer: specialized agents and harnesses that can perform known categories of work reliably enough to be selected, invoked, monitored, and swapped. This is the same motion as the earlier off-the-shelf harness prediction, but with more attention on topology. The harness becomes a rentable capability; the orchestrator becomes the routing and accountability surface.

A2A is already a foundation for this because it describes agents discovering each other's capabilities, communicating as opaque systems, exchanging task state, and delegating work without collapsing every worker into a tool call. If that style of protocol becomes normal, then specialized agents start to look less like custom integrations and more like addressable resources in a graph.

Resolve true if, by the resolution date, at least two major AI or cloud ecosystems publicly document or ship an agent layer where a user-facing orchestrator/client agent can discover, select, or delegate tasks to specialized remote agents through A2A, an A2A-compatible implementation, or a comparable open or documented agent-to-agent contract. A qualifying worker agent should be more than a function call or MCP tool: it should expose an agent identity or capability card, accept stateful task delegation, return progress or artifacts, and be usable without the orchestrator knowing its internal toolchain.

Resolve false if the market remains mostly chat assistants calling tools, bespoke internal multi-agent systems, or manually wired agent templates with no broadly recognizable delegation/resource layer. Resolve ambiguous if the pattern exists only in closed pilots, if it is visible in one ecosystem but not enough to look like a layer, or if the terminology changes while the architecture is only partly present.
