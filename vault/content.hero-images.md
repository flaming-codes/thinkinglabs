---
id: content.hero-images
title: Entity hero images
desc: Convention-based local assets for content detail heroes and OG detail cards.
status: active
owner: Tom Wild
audience: [agents, engineering]
last_verified: 2026-06-05
ttl_days: 180
layer: content
code_refs:
  - file: src/lib/hero-assets.ts
    symbol: resolveHeroSource
    kind: function
    namespace: value
  - file: src/frontend/thinkinglabs-ui/lib/entity-hero.ts
    symbol: resolveEntityHero
    kind: function
    namespace: value
  - file: src/pages/og/[...slug].png.ts
    symbol: getStaticPaths
    kind: const
    namespace: value
tags: [content, rendering, images]
---

# Entity hero images

Entity detail heroes are resolved by local asset convention, not frontmatter.
Add `src/assets/<kind>/<slug>.<ext>` where `<kind>` is the route folder and
`<slug>` is the content file slug.

Supported extensions are `avif`, `webp`, `png`, `jpg`, and `jpeg`, in that
precedence order. Missing per-entity assets fall back to `src/assets/hero.<ext>`
using the same extension precedence.
The rendered detail page and generated OG detail image share the same convention
and extension order.
