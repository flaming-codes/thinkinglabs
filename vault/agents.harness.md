---
id: agents.harness
title: Agent Harness source of truth
desc: Agent-facing configuration changes must start in .harness/src and be applied.
status: active
owner: Tom Wild
audience: [agents, engineering]
last_verified: 2026-06-05
ttl_days: 180
layer: agents
tags: [agents, harness]
---

# Agent Harness source of truth

Prompts, skills, MCP configuration, subagents, agent settings, lifecycle hooks,
and generated provider instructions are managed through `.harness/src/**`. Do
not hand-edit generated provider outputs for those concerns.

After changing Harness source, run `pnpm harness apply` before finishing and
include the generated output changes in the same review.
