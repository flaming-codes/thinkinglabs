---
id: deployment
title: Deployment model
desc: Static site deployment is separate from the optional MCP HTTP runtime.
status: active
owner: Tom Wild
audience: [agents, engineering]
last_verified: 2026-06-05
ttl_days: 180
layer: deployment
tags: [deployment, static-site]
---

# Deployment model

The production website is a 100% static Astro build deployed as a DigitalOcean
App Platform Static Site. `.do/app.yaml` runs `pnpm build`, uploads `dist/`,
uses `index.html` and `404.html`, and sets build-time
`SITE_URL=https://thinkinglabs.run` and `NODE_VERSION=22`. Production does not
run Node for page rendering; `pnpm preview` / `astro preview` is local QA only.

DigitalOcean Static Sites have fixed cache behavior here: 24h at the CDN edge,
10s in browsers, and purge on deploy. Per-path headers are not supported in
this host setup.

The MCP HTTP server is a separate runtime concern and is not deployed by
`.do/app.yaml`. If hosted on DigitalOcean, add it as a `services:` entry beside
`static_sites:`, not as an Astro SSR route.
