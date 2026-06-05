---
id: content.rendering
title: Rendering surfaces
desc: Astro pages and machine-readable surfaces render from typed content collections.
status: active
owner: Tom Wild
audience: [agents, engineering]
last_verified: 2026-06-05
ttl_days: 180
layer: content
code_refs:
  - file: src/frontend/thinkinglabs-ui/lib/page-lifecycle.ts
    symbol: onPageReady
    kind: function
    namespace: value
  - file: src/lib/surfaces.ts
    symbol: SURFACES
    kind: const
    namespace: value
  - file: src/lib/agent-metadata.ts
    symbol: agentMetadataForContent
    kind: function
    namespace: value
tags: [content, rendering, surfaces]
---

# Rendering surfaces

Astro pages, JSON APIs, Markdown route variants, feeds, `llms.txt`, and MCP
resources are projections of source content and registries. The rendered site
does not read `dist/index.sqlite`.

New public pages or data surfaces should be represented in `SURFACES` when they
need to appear in navigation, `llms.txt`, or agent-facing inventories.

Agent-facing derived metadata is centralized in `src/lib/agent-metadata.ts`.
Do not hand-author token counts in frontmatter. JSON APIs, Markdown detail
envelopes, MCP responses, and UI copy-for-AI affordances should reuse the
shared helper and the `.md` route convention.

The static site keeps Astro's hash-based CSP enabled and keeps route CSS
external with `build.inlineStylesheets: "never"`. Do not add
`<ClientRouter />` to the shared layout while CSP is enabled; Astro's CSP
support does not support the client router runtime. Browser scripts that need
setup should compose through `onPageReady(...)` so they run on normal MPA page
loads and remain compatible with Astro lifecycle events if a router is ever
introduced behind a matching CSP strategy.
