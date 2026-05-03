# Remote MCP HTTP server

`servers/thinkinglabs-mcp-http/` exposes the same MCP server as `servers/thinkinglabs-mcp/` over HTTP, so an agent can connect without cloning the repo.

The transport is the spec'd **Streamable HTTP** transport in **stateless** mode — every POST gets a fresh `McpServer` and `StreamableHTTPServerTransport`, so the process scales horizontally and works on serverless platforms. GET and DELETE return `405 method not allowed`; sessions are not used.

## Run locally

```sh
pnpm mcp:thinkinglabs:http
# mcp-http: listening on http://127.0.0.1:8787/mcp
```

The server reuses `createThinkinglabsMcpServer` from the stdio entrypoint, so the resources, tools, and store-fallback semantics are identical.

## Configuration

All knobs are optional. Read from `process.env` via the validated schema in `src/lib/env.ts`.

| Var                          | Default         | Purpose                                                                                                            |
| ---------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------ |
| `MCP_HTTP_HOST`              | `127.0.0.1`     | Bind address. Set to `0.0.0.0` only behind a reverse proxy.                                                        |
| `MCP_HTTP_PORT`              | `8787`          | TCP port.                                                                                                          |
| `MCP_HTTP_ALLOWED_HOSTS`     | _(empty)_       | Comma-separated `Host`-header allowlist for DNS-rebinding protection.                                              |
| `MCP_HTTP_ALLOWED_ORIGINS`   | _(empty)_       | Comma-separated `Origin` allowlist for CORS + DNS-rebinding protection.                                            |
| `MCP_HTTP_TRUST_PROXY`       | `0`             | Set to `1` to use the first `X-Forwarded-For` entry as the rate-limit key. Only enable behind a proxy you control. |
| `THINKINGLABS_MCP_REPO_ROOT` | `process.cwd()` | Repo root the underlying MCP server reads from.                                                                    |

CLI flags `--repo-root <path>`, `--host <addr>`, and `--port <n>` override the corresponding env vars.

## Public deployment

```sh
MCP_HTTP_HOST=0.0.0.0 \
MCP_HTTP_PORT=8787 \
MCP_HTTP_ALLOWED_HOSTS=mcp.thinkinglabs.run,thinkinglabs.run \
MCP_HTTP_ALLOWED_ORIGINS=https://thinkinglabs.run,https://claude.ai,https://chatgpt.com \
MCP_HTTP_TRUST_PROXY=1 \
pnpm mcp:thinkinglabs:http
```

When either allowlist is non-empty, `enableDnsRebindingProtection` is turned on inside the SDK transport. CORS responses always set:

- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: content-type, mcp-session-id, mcp-protocol-version`
- `Access-Control-Expose-Headers: mcp-session-id, mcp-protocol-version`
- `Access-Control-Max-Age: 600`

When `MCP_HTTP_ALLOWED_ORIGINS` is empty, the server returns `Access-Control-Allow-Origin: *` for ergonomics. Behind a public hostname it should not stay empty in production.

## Rate limiting

A per-key in-memory token bucket limits abuse. Defaults: `capacity=30`, `refillPerSecond=1` — i.e. a 30-request burst then ~1 RPS sustained per IP. The key is `req.socket.remoteAddress` by default; with `MCP_HTTP_TRUST_PROXY=1` it switches to the first `X-Forwarded-For` entry. Idle keys age out after 10 minutes. Replace with a CDN-level limiter (Cloudflare, nginx) for anything load-bearing.

`429` responses include a `Retry-After: 1` header.

## Health check

`GET /healthz` returns `{"status":"ok"}` — useful for load balancer probes. It bypasses rate limiting and does not consume MCP machinery.

## Connecting an agent

Any MCP-aware client that supports a remote URL works. Examples:

**Claude Desktop / Claude Code config:**

```json
{
  "mcpServers": {
    "thinkinglabs-remote": {
      "url": "https://mcp.thinkinglabs.run/mcp"
    }
  }
}
```

**Programmatic (TypeScript SDK):**

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "demo", version: "0.0.1" });
await client.connect(
  new StreamableHTTPClientTransport(new URL("https://mcp.thinkinglabs.run/mcp")),
);
```

There is no `.well-known/` discovery for unauth'd MCP endpoints; publish the URL alongside `llms.txt`.

## Why stateless

A personal site does not need long-lived MCP sessions: every read query (`query_view`, resource fetches) is independent. Stateless mode means no session table, no sticky routing, no SSE keepalive — and the same code can ship on a Node host, a Docker image, a Vercel function, or a Cloudflare Worker (with minor adapter changes). Stateful sessions can be added later by setting `sessionIdGenerator` in `server.ts`, but that requires sticky sessions or a shared session store, which is not worth it here.

## Limits and trade-offs

- **No streaming tool output.** `enableJsonResponse: true` returns the full result in one JSON body. None of the current tools stream, so this is fine.
- **No auth.** Public corpus, public surfaces. If you fork this and need auth, wire `requireBearerAuth` from `@modelcontextprotocol/sdk/server/auth/...` in front of the handler.
- **In-memory rate limit.** Resets on restart and does not coordinate across replicas. Treat it as a defence-in-depth layer behind a CDN.
- **Body cap.** 1 MiB, 30s request timeout. MCP request payloads are tiny in practice; larger uploads should not happen.

## Architecture context

The HTTP server is a thin shell over the existing factory:

```
servers/thinkinglabs-mcp/server.ts        # createThinkinglabsMcpServer({ repoRoot })
servers/thinkinglabs-mcp-http/server.ts   # startMcpHttpServer({ repoRoot, ... })  ← uses the factory
servers/thinkinglabs-mcp-http/cli.ts      # entry point + signal handling
servers/thinkinglabs-mcp-http/rate-limit.ts
```

If a behaviour change is needed for both transports, edit the factory in `servers/thinkinglabs-mcp/server.ts` — both stdio and HTTP pick it up.
