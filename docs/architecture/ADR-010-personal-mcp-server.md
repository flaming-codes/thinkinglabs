# ADR-010 — Personal MCP server resource and tool taxonomy

- **Status**: Accepted
- **Date**: 2026-05-01
- **Supersedes**: —
- **Superseded by**: —

## Context

M6 makes the repo usable by external agents without scraping HTML. The server must preserve ADR-001's source-of-truth rule: content remains markdown/JSON in git, while any SQLite index is disposable. The public tier should be useful before private authentication exists.

## Decision

`servers/thinkinglabs-mcp/` is a stdio MCP server built on `@modelcontextprotocol/sdk` and launched with `pnpm mcp:thinkinglabs -- --repo-root <repo>`. It exposes fixed JSON resources for the public collections, current focus, recent inputs, recent claims, active projects, recent decisions, pending/resolved predictions, prediction calibration, and schema versioning. Per-object resource templates use `thinkinglabs://<kind>/{slug}` for thoughts, claims, projects, decisions, predictions, inputs, and questions. The store reads `dist/index.sqlite` when present and falls back to validated source content via the existing index builder.

The public tools are `query_view`, `contact.precheck`, `contact.send`, `question.submit`, and `subscribe_brain_diff`. `contact.send` is intentionally a handoff validator, not an SMTP client. `question.submit` writes structured reader answers into the local submissions tree for the existing triage agent. `subscribe_brain_diff` returns public feed URLs and can include deterministic recent entries from git history. The authenticated tier is deferred behind the public-only schema-version contract; no private resources are exposed by default.

## Consequences

Agents get structured public data without a new database or CMS. The fixed resource names give consumers stable targets, while `query_view` handles topic filtering over the same public views. Future auth can wrap the server without changing the public resource taxonomy.

## Alternatives considered

HTTP-first hosting was rejected for M6 because stdio is simpler to install and test locally. Reading only `dist/index.sqlite` was rejected because a clean clone should still serve public content before the derived index exists.

### Current state (2026-05-02)

The server ships at `servers/thinkinglabs-mcp/` and is launched via `pnpm mcp:thinkinglabs`. The fixed resource taxonomy includes `thinkinglabs://ai/current-models` (the env-resolved `ModelRef` per capability tier). Provenance is committed to the source tree but is intentionally **not** exposed via MCP resources — `kind !== "provenance"` is filtered out of `DETAIL_KINDS` in `servers/thinkinglabs-mcp/server.ts`. The full resource and tool list lives in `docs/agents/mcp-server.md`. The authenticated tier remains deferred.

### Update (2026-05-03): remote HTTP transport added

The "HTTP-first hosting was rejected" note above is superseded by [ADR-013](./ADR-013-remote-mcp-http.md), which adds a Streamable HTTP entrypoint at `servers/thinkinglabs-mcp-http/` (`pnpm mcp:thinkinglabs:http`). It wraps the same `createThinkinglabsMcpServer` factory, so the resource and tool taxonomy described here applies unchanged. Stdio is still the default for local agents that want to point at a specific checkout; the HTTP transport is for remote agents that should not need to clone.
