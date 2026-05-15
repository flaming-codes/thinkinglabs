# Personal MCP Server (stdio)

`servers/thinkinglabs-mcp/` exposes the public personal repo as a stdio MCP server using `@modelcontextprotocol/sdk`.

> **Looking for the remote endpoint?** The same server factory is also exposed over Streamable HTTP at `servers/thinkinglabs-mcp-http/` (run with `pnpm mcp:thinkinglabs:http`, deployed at `https://mcp.thinkinglabs.run/mcp`). Resources, tools, and store-fallback semantics are identical to the stdio variant. See [`mcp-http-server.md`](./mcp-http-server.md). Architectural rationale for the split is in [`../architecture/ADR-013-remote-mcp-http.md`](../architecture/ADR-013-remote-mcp-http.md).

Run locally with:

```sh
pnpm mcp:thinkinglabs -- --repo-root <path-to-repo>
```

The repo root can also be set via the `THINKINGLABS_MCP_REPO_ROOT` env var (validated through `src/lib/env.ts`); falls back to `process.cwd()`.

The store prefers `dist/index.sqlite` when it exists and falls back to validated markdown under `content/`.

## Public read-only resources

Fixed JSON views at:

- `thinkinglabs://thoughts`
- `thinkinglabs://claims`
- `thinkinglabs://claims/recent`
- `thinkinglabs://claims/by-tag/{tag}`
- `thinkinglabs://projects`
- `thinkinglabs://projects/active`
- `thinkinglabs://decisions`
- `thinkinglabs://decisions/recent`
- `thinkinglabs://predictions`
- `thinkinglabs://predictions/pending`
- `thinkinglabs://predictions/resolved`
- `thinkinglabs://predictions/calibration`
- `thinkinglabs://inputs`
- `thinkinglabs://inputs/recent`
- `thinkinglabs://observations`
- `thinkinglabs://questions`
- `thinkinglabs://current_focus`
- `thinkinglabs://schema/version`

Per-object detail templates use `thinkinglabs://<kind>/{slug}` for `thoughts`, `claims`, `projects`, `decisions`, `predictions`, `inputs`, `observations`, `questions`, `posts`, and `changed-my-mind`.

## Tools

These tools are available on both transports (stdio and remote HTTP). `question.submit` writes to the local filesystem, so it is only meaningful when pointed at a checkout.

- `query_view` — filters one public view by text, tags, and limit.
- `contact.precheck` — checks a proposed inquiry against `public/contact.json`.
- `contact.send` — validates a message and returns the public email handoff; it does not send mail.
- `question.submit` — writes a structured answer into `submissions/questions/<slug>/` for `triage-questions`.
- `subscribe_brain_diff` — returns public feed URLs and can include deterministic recent entries from git history.

## Model resource

The active model configuration is exposed as a read-only resource.

- `thinkinglabs://ai/current-models` — the env-resolved `ModelRef` per capability tier under the current configuration (mirrors `currentModelRefs()` from `src/lib/llm.ts`).

Provenance remains in source (`content/provenance`) but is intentionally not exposed via MCP runtime resources or views.
