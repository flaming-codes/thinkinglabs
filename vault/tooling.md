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

The project uses Node `>=22.19.0`, pnpm `10.33.2`, and Vite+ through the global
`vp` CLI. Run `vp install` after pulling remote changes.

`pnpm verify` is the normal local gate for code changes: it cleans, typechecks,
runs `vp check`, runs `pnpm semantic:check`, regenerates `vault/HIERARCHY.md`
and `vault/.semantic-layer/code-refs.json` via `pnpm semantic:index`, builds,
checks structured data, and runs Vitest. For read-only tasks, prefer
`pnpm semantic:check` because `pnpm semantic:index` writes generated vault
artifacts.

The mandatory individual gates remain `pnpm format`, `pnpm lint`,
`pnpm typecheck`, and `pnpm test`; Harness-source changes also require
`pnpm harness apply`. Tooling claims are grounded in `package.json`,
`vite.config.js`, and `semantic-layer.config.yml`.
