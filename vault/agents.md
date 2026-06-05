---
id: agents
title: Agent workflows
desc: Agent-facing configuration, curation workflows, and query surfaces.
status: active
owner: Tom Wild
audience: [agents, engineering]
last_verified: 2026-06-05
ttl_days: 180
layer: agents
tags: [agents, workflow]
---

# Agent workflows

Agent-facing configuration is managed by Agent Harness. Proposal agents write
queued proposals and accepted mutations go through review handlers, not direct
background writes to content.

Load [[agents.harness]] before changing prompts, skills, settings, or lifecycle
configuration. Load [[agents.proposals]] before changing proposal agents.
