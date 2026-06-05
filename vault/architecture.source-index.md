---
id: architecture.source-index
title: Source and index split
desc: Content markdown is canonical and dist/index.sqlite is derived for agents.
status: active
owner: Tom Wild
audience: [agents, engineering]
last_verified: 2026-06-05
ttl_days: 180
layer: architecture
code_refs:
  - file: src/index/builder.ts
    symbol: collectObjects
    kind: function
    namespace: value
  - file: src/index/builder.ts
    symbol: writeIndex
    kind: function
    namespace: value
tags: [architecture, index, content]
---

# Source and index split

`content/<kind>/*.md` is the canonical source. `dist/index.sqlite` is derived,
gitignored, and rebuilt by `pnpm build:index` or the postbuild hook.

The index builder walks every content kind, parses strict frontmatter, validates
with `KIND_SCHEMAS`, derives links and tags, and writes deterministic SQLite.
Do not add code paths that mutate the index without going through source
markdown.

The rendered Astro site reads validated source content through Astro
collections and registries. It must not read `dist/index.sqlite` at render time.
