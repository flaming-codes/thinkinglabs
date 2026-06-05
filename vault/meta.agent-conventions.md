---
id: meta.agent-conventions
title: Agent conventions
desc: How agents should read and maintain the semantic layer.
status: active
owner: Tom Wild
audience: [agents]
last_verified: 2026-06-05
ttl_days: 365
layer: meta
tags: [meta, agents, workflow]
---

# Agent conventions

Before changing repository behavior, read `vault/HIERARCHY.md` first and then
load only the relevant notes. Follow `code_refs` from those notes before editing
source.

After changing durable architecture, APIs, pipelines, agent workflows, or
operational behavior, update the relevant `vault/*.md` notes and schemas. Then
run `pnpm semantic:check` and `pnpm semantic:index`.

Use `semantic-layer refine stage` for durable non-assistant project signals that
may improve this vault but should not be trusted directly.
