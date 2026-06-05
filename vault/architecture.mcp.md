---
id: architecture.mcp
title: MCP architecture
desc: The stdio and HTTP transports share one MCP server factory and store.
status: active
owner: Tom Wild
audience: [agents, engineering]
last_verified: 2026-06-05
ttl_days: 180
layer: architecture
code_refs:
  - file: servers/thinkinglabs-mcp/server.ts
    symbol: createThinkinglabsMcpServer
    kind: function
    namespace: value
  - file: servers/thinkinglabs-mcp/store.ts
    symbol: queryView
    kind: function
    namespace: value
tags: [architecture, mcp, agents]
---

# MCP architecture

Both MCP transports use `createThinkinglabsMcpServer`. Behavior shared by stdio
and HTTP belongs in the factory or store. HTTP-only concerns such as CORS,
body-size caps, DNS-rebinding protection, and rate limiting stay in the HTTP
transport.

The MCP store prefers `dist/index.sqlite` and falls back to validated markdown
through the index builder when the derived index is absent.

MCP resources and `query_view` targets are derived from public views and
`KIND_REGISTRY`, but `provenance` is explicitly excluded from runtime MCP views
and detail resources. Keep the server public-only unless the auth contract
changes.

Most MCP tools are read-only or handoff-only: `contact.send` never sends mail.
`question.submit` is the exception; it writes structured reader answers to
`submissions/questions/<slug>/`, not to `content/` or `dist/index.sqlite`.
