---
id: tooling
title: Tooling
desc: Vite+, pnpm, and validation commands used in this repository.
status: active
owner: Tom Wild
audience: [agents, engineering]
last_verified: 2026-06-05
ttl_days: 180
layer: tooling
tags: [tooling, validation]
---

# Tooling

The project uses Vite+ through `vp` and package scripts. `pnpm verify` is the
normal local gate for code changes, and now includes semantic-layer validation.

Use `pnpm semantic:check` to validate the trusted vault and `pnpm semantic:index`
to regenerate its agent-facing hierarchy and code-reference sidecar.
