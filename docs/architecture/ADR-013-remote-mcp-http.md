# ADR-013 — Remote MCP server over Streamable HTTP

- **Status**: Accepted
- **Date**: 2026-05-03
- **Supersedes**: —
- **Superseded by**: —
- **Extends**: ADR-010

## Context

ADR-010 deferred HTTP hosting because stdio was simpler to install and test for M6. Six months in, the friction is real: every external agent connecting to the corpus has to clone the repo, install pnpm dependencies, and run `pnpm mcp:thinkinglabs` locally. Most clients (Claude Desktop, Claude Code, ChatGPT custom MCPs, programmatic SDK consumers) accept a remote URL just as easily as a stdio command, so the clone step is pure overhead. The corpus is already public; there is nothing private to gate.

The MCP spec has also moved on. The HTTP+SSE transport from protocol version `2024-11-05` is deprecated; the current remote transport is **Streamable HTTP** (`2025-03-26` / `2025-06-18`), which collapses request/response and optional streaming into a single endpoint and supports both stateful and stateless modes. The TypeScript SDK exposes this as `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`.

## Decision

Add a **remote** MCP entrypoint at `servers/thinkinglabs-mcp-http/` (parallel to the existing stdio one at `servers/thinkinglabs-mcp/`). Both wrap the **same** `createThinkinglabsMcpServer({ repoRoot })` factory in `servers/thinkinglabs-mcp/server.ts`, so resources, tools, and store-fallback semantics never drift. The HTTP entrypoint is published at `https://mcp.thinkinglabs.run/mcp` and listed in `src/lib/surfaces.ts` (and therefore `public/llms.txt`) alongside the existing surfaces.

Concretely:

- **Streamable HTTP, stateless mode.** `sessionIdGenerator` is omitted; `enableJsonResponse: true`. Each POST constructs a fresh `McpServer` + `StreamableHTTPServerTransport`, handles the request, and tears them down on `res.close`. `GET` and `DELETE` to `/mcp` return `405`. There is no session table and no SSE keepalive.
- **Raw `node:http`, no Express.** The SDK transport accepts `IncomingMessage`/`ServerResponse` directly; the only non-stdlib dep is `@modelcontextprotocol/sdk`, which is already pinned. This keeps the runtime footprint minimal and matches the project's preference for not introducing frameworks for one route.
- **Astro stays static.** The HTTP server is a separate Node process, not an Astro endpoint. Wiring an SSR-only route into the otherwise-static site would require an Astro adapter and `output: 'server'`, which is invasive for a single dynamic route.
- **Defence in depth, no auth.** The SDK transport's DNS-rebinding protection is enabled when `MCP_HTTP_ALLOWED_HOSTS` or `MCP_HTTP_ALLOWED_ORIGINS` is non-empty. CORS exposes `Mcp-Session-Id` and `MCP-Protocol-Version` per the spec. An in-memory token-bucket rate limiter (default `capacity=30`, `refillPerSecond=1`) keys on `req.socket.remoteAddress` (or the first `X-Forwarded-For` entry when `MCP_HTTP_TRUST_PROXY=1`). Body is capped at 1 MiB and the request timeout is 30 s. `GET /healthz` is unrate-limited and bypasses MCP machinery for load-balancer probes.
- **Bind defaults to loopback.** `MCP_HTTP_HOST=127.0.0.1` until the operator explicitly opts into a public bind. Public deployment is expected to sit behind a reverse proxy or platform router that terminates TLS.

The HTTP transport is **public-only**, just like the stdio one. Authentication is intentionally deferred (and was also deferred in ADR-010); when it's needed, the SDK's `requireBearerAuth` helper can wrap the handler without changing the resource taxonomy.

## Consequences

External agents can connect to the corpus over a single HTTPS URL with no setup. The two transports share resources and tools, so a behaviour change touches one factory and lights up everywhere. Stateless mode means the HTTP server is trivially horizontally scalable and works on serverless platforms (Node Lambda, Vercel functions, Cloudflare Workers with a small adapter) without sticky sessions.

The downside is that the HTTP path takes on operational concerns — rate limiting, CORS, DNS-rebinding protection, deployment topology — that the stdio path could ignore. Those live in `servers/thinkinglabs-mcp-http/server.ts` and never bleed into the factory. The split is documented in [`docs/agents/mcp-http-server.md`](../agents/mcp-http-server.md).

The SDK has known typing friction with `exactOptionalPropertyTypes` (the implementation declares `onclose` as `(() => void) | undefined`, which doesn't satisfy the `Transport` interface's `onclose?: () => void` under exact-optional). This is handled with a single, commented `as unknown as Transport` cast at the `server.connect` call.

## Alternatives considered

- **Astro SSR endpoint at `/mcp`.** Would unify deploy, but Astro 6 demands `output: 'server'` plus an adapter for any dynamic route, marking every existing prerendered route explicitly. Too invasive for one endpoint. Reconsider if the site grows other dynamic surfaces.
- **Express.** The SDK README and examples use Express, but it's only needed for body parsing and middleware glue we don't need. Raw `node:http` is ~30 lines of body-reading code and avoids the dep.
- **Stateful Streamable HTTP.** Sessions buy resumable streams and progressive notifications. None of the current tools stream or progress; sessions would just add a session table and sticky-routing requirement. Reconsider when a tool needs to push.
- **HTTP+SSE (deprecated).** Older spec version, deprecated in `2025-03-26`. No reason to ship a deprecated transport for a new entrypoint.
- **Auth-by-default.** The corpus is public. Adding OAuth or bearer tokens would not protect anything that isn't already on the static site, but it would lock out casual `curl` users and toy clients.
