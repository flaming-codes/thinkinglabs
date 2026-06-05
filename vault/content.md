---
id: content
title: Content model
desc: Schema-driven public objects rendered into site, API, feed, and MCP surfaces.
status: active
owner: Tom Wild
audience: [agents, engineering]
last_verified: 2026-06-05
ttl_days: 180
layer: content
tags: [content, schemas]
---

# Content model

Every public object kind is backed by markdown frontmatter validated with Zod.
Changing a kind requires keeping schemas, registry metadata, Astro collections,
routes, APIs, and agent surfaces aligned.

Load [[content.schemas]] before changing schemas or registry behavior. Load
[[content.rendering]] before changing Astro rendering or generated public
surfaces. Load [[content.hero-images]] before changing entity detail hero or OG
image behavior.
