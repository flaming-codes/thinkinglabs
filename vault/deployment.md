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

The production website is a static Astro build deployed as a DigitalOcean App
Platform Static Site. Production does not run Node for page rendering.

The MCP HTTP server is a separate runtime concern. If hosted, it should be a
service beside the static site, not an Astro SSR route.
