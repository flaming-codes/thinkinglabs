---
id: content.schemas
title: Schema registry
desc: KIND_SCHEMAS and KIND_REGISTRY are the two core content registries.
status: active
owner: Tom Wild
audience: [agents, engineering]
last_verified: 2026-06-05
ttl_days: 180
layer: content
code_refs:
  - file: src/schemas/index.ts
    symbol: KIND_SCHEMAS
    kind: const
    namespace: value
  - file: src/lib/registry.ts
    symbol: KIND_REGISTRY
    kind: const
    namespace: value
tags: [content, schemas, registry]
---

# Schema registry

`KIND_SCHEMAS` owns validation and link-field metadata. `KIND_REGISTRY` owns
public routing, listing labels, title/date fields, API exposure, and MCP
visibility. Both registries are exhaustively typed against `Kind`.

When adding a kind, update `src/schemas/<kind>.ts`, register it in
`KIND_SCHEMAS`, add the `KIND_REGISTRY` entry, declare the Astro collection in
`src/content.config.ts`, add listing and detail routes, add
`src/pages/api/<kind>.json.ts`, and update any public surfaces that should
expose it.
