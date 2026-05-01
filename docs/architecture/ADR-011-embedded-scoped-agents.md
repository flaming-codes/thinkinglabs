# ADR-011 — Embedded scoped agents

- **Status**: Accepted
- **Date**: 2026-05-01
- **Supersedes**: —
- **Superseded by**: —

## Context

M7 introduces embedded agents: small interactive tools that can appear inside pages without taking dependencies on a live service. The site does not yet have high-traffic posts, so the first implementation should favor reusable infrastructure and a safe seed embed over a broad product surface.

## Decision

Embedded agents live under `embeds/` and register an `EmbeddedToolPayload` with a public contract. The contract declares the id, kind, endpoint, capabilities, write scope, storage key, and no-JS fallback rows. The registry is the only source for static API path generation.

The first embed is `prediction-calibration-logger`. Its data comes from embed-owned static JSON. The component renders a complete fallback table before any client code runs. When JavaScript is available, the embed can append local calibration entries to browser `localStorage`; it never writes to content, queue files, APIs, or external services.

`src/pages/api/embed/[id].json.ts` prerenders one JSON artifact per registered embed. The endpoint is same-origin static data, not a live agent runtime.

## Consequences

Future embedded agents can share the component and contract tests while keeping their data and scope local to `embeds/<id>/`. CI can validate contracts, fallback shape, and static data without launching a browser.

## Caveats

Local entries are intentionally browser-local and disposable. They are not analytics, telemetry, or durable site data.

## Alternatives considered

A live POST endpoint was rejected because it would turn the first embed into a server mutation surface. Page-specific one-off markup was rejected because M7 is infrastructure work and should establish a reusable contract before traffic justifies custom embeds.
