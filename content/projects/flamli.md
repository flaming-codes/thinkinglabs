---
title: Flamli
status: alive
started: 2026-03-31
current_question: "Can a chat-native agent safely grow its own tool surface while keeping identity, policy, terminal access, and scheduling explicit?"
help_welcome: "Useful pressure here is practical: safer mutation approvals, better Slack workflows, and clear boundaries around when an agent may touch the local machine."
links:
  repo: https://github.com/flaming-codes/flamli
related_thoughts: []
related_claims: []
tags: [agents, ai, deno, slack, automation, self-hosting]
---

Flamli is a self-hosted chat agent that treats Slack and Discord as the primary interface, not as notification sidecars. The interesting part is not that it can answer messages. The interesting part is that the agent runtime is built around identity, policy, memory, scheduling, and a deliberately constrained ability to change its own skills.

The project runs on Deno 2 with TypeScript, Hono, the Vercel AI SDK, Ollama support, Slack Bolt, Zod, Deno KV, and optional Redis. Its HTTP surface is operational rather than decorative: health checks, readiness, and webhooks for Slack and Discord. Most of the real design lives behind that surface in adapter handling, caller-scoped state, scheduler dispatch, and the set of tools assembled for each agent turn.

Flamli is also a test of how much agency can be made boring enough to trust. Mutation tools can write, delete, and roll back skills, but only through explicit policy gates. Terminal access exists, but is optional, non-interactive, and routed through a dedicated workdir. The scheduler can create recurring agent turns or shell commands, but persistence and dispatch are made visible rather than hidden inside a chat transcript.

The current version is still more runtime than product. Slack Socket Mode is the main local testing path, Discord is webhook-based, state persists through Deno KV or Redis, and generated skills load dynamically from the `skills/` directory. The missing pieces are the pieces that should not be rushed: human approval UI for mutation-capable tools, richer progress streaming, more adapters, and a heavier secondary harness for code-changing work.

What I want from Flamli is a chat agent that can become more useful without becoming slippery. It should be able to remember, schedule, inspect, and even alter its own capabilities, while leaving enough explicit structure that a human can still tell where permission ends.
