---
id: meta
title: Semantic layer metadata
desc: Operating rules for maintaining the semantic-layer vault.
status: active
owner: Tom Wild
audience: [agents, engineering]
last_verified: 2026-10-24
ttl_days: 365
layer: meta
tags: [meta, agents]
---

# Semantic layer metadata

The semantic layer holds durable repository context. Keep it small, validated,
and directly useful for future tasks. Use it for architecture, operational, API,
and workflow facts that agents should trust before reading broad source.

The generated index is rooted at [[root#Thinking Labs semantic layer]] and should
be refreshed with `pnpm semantic:index` after vault edits.

`semantic-layer.config.json` requires the extra frontmatter field `layer`, writes
code references to `vault/.semantic-layer/code-refs.json`, maintains the local
vector index in `vault/.semantic-layer/vault.sqlite` (gitignored), and stages
refinement candidates under `vault/.semantic-layer/refinements`. After vault
changes, run both `pnpm semantic:check` and `pnpm semantic:index`.
