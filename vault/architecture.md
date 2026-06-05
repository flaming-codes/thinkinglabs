---
id: architecture
title: Architecture map
desc: High-level system architecture for the source-backed thinking surface.
status: active
owner: Tom Wild
audience: [agents, engineering]
last_verified: 2026-06-05
ttl_days: 180
layer: architecture
tags: [architecture]
---

# Architecture map

Thinking Labs is source-tree first. Canonical content objects live in `content/`;
schemas validate markdown frontmatter, registries control public exposure, Astro
renders the static site, and the agent-facing SQLite index is rebuilt from the
same source.

Load [[architecture.source-index]] before changing source/index behavior.
Load [[architecture.mcp]] before changing the MCP server or agent query
surfaces.
