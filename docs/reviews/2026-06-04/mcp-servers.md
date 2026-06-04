# MCP Servers Review - Thinking Labs (2026-06-04)

**Reviewer:** MCP Servers · **Branch:** feat-design-v2 @ 1e73fd0

## Executive summary

The MCP layer is in good shape and tracks current SDK 1.29 idioms closely: it uses the non-deprecated `registerTool`/`registerResource` APIs, `ResourceTemplate` for parameterized views, lets `McpServer` auto-derive capabilities, and implements stateless Streamable-HTTP exactly as the SDK's official `simpleStatelessStreamableHttp` example does (fresh `McpServer` + transport per POST, `res.on("close")` cleanup, 405 on GET/DELETE, no `sessionIdGenerator`). The factory/transport split is clean - shared behaviour lives in `server.ts`, transport concerns stay in the HTTP server - and stdout hygiene is correct (no `console.*` anywhere under `servers/`). The one real correctness gap is that every tool returns `structuredContent` while no tool declares an `outputSchema`; per the SDK maintainers this is discouraged and leaves clients with no contract to validate against. Secondary issues are efficiency (sqlite handle churn in the resource-`list` callbacks and per-view queries) and a few honesty/robustness nits around `subscribe_brain_diff` semantics and unbounded `query_view` text inputs. Overall MCP correctness health: **Good (B+)** - protocol-correct and idiomatic, with one contract gap and a handful of polish items.

## Scope & method

Read `servers/thinkinglabs-mcp/{server,handlers,store,types,cli}.ts`, `servers/thinkinglabs-mcp-http/{server,cli,rate-limit}.ts`, `src/lib/registry.ts`, and `tests/thinkinglabs-mcp/handlers.test.ts`. Verified SDK idioms against the installed `@modelcontextprotocol/sdk@1.29.0` type/JS sources in `node_modules` (`server/mcp.{d.ts,js}`, `server/streamableHttp.d.ts`, `server/webStandardStreamableHttp.js`, `shared/protocol.js`, and the bundled `examples/server/simpleStatelessStreamableHttp.js`). Cross-checked the 405-on-GET/DELETE and `structuredContent`-without-`outputSchema` questions against deepwiki `modelcontextprotocol/typescript-sdk`. Read-only; no servers or builds were run.

## Findings

### [Medium] Tools return `structuredContent` but never declare an `outputSchema`

**Location:** `servers/thinkinglabs-mcp/handlers.ts:252-257` (`jsonToolResult` always sets `structuredContent`); `servers/thinkinglabs-mcp/server.ts:42-89` (all five `registerTool` configs omit `outputSchema`).
**Observation:** Every tool handler returns both `content` (stringified JSON) and `structuredContent`, but no `registerTool` call declares an `outputSchema`. The SDK only validates `structuredContent` when an `outputSchema` is present (`server/mcp.js:186` short-circuits `validateToolOutput` when `!tool.outputSchema`), so today this passes silently.
**Impact (spec/SDK reference):** The SDK docs (`server/mcp.d.ts:257-258`) state a tool should return `structuredContent` _if_ it has an `outputSchema`, and `content` otherwise. Deepwiki confirms returning `structuredContent` with no `outputSchema` is "discouraged… the client has no basis for validating the structuredContent, making its presence ambiguous and prone to unexpected behavior." Concretely, the server advertises no output contract in `tools/list`, so well-behaved clients cannot rely on the structured shape, and the dual-emission is wasted bytes. This is the only finding that touches the public tool contract.
**Recommendation:** Either (a) declare a real `outputSchema` (Zod raw shape) per tool so the SDK validates and publishes the contract, or (b) if you intend tools to remain schema-less, stop emitting `structuredContent` and return `content`-only. Option (a) is the higher-value path given these are public, agent-facing tools. Note error envelopes differ in shape from success envelopes per tool (e.g. `query_view` error has `source/reason`, success has `view/source/count/items`), so an `outputSchema` would need to be a union or the error fields made optional - worth designing deliberately.
**Effort:** M

### [Low] `resources/list` opens and closes the SQLite handle once per detail kind

**Location:** `servers/thinkinglabs-mcp/server.ts:172-190` (each `registerDetailResource` `list` callback calls `queryView`), feeding `store.ts:165-179` `querySqlite`, which does `new Database(...)` / `db.close()` per call.
**Observation:** There are ~10 detail kinds, each registered with a `ResourceTemplate` whose `list` callback runs `queryView(..., limit: 50)`. On a single `resources/list` request the SDK invokes every template's `list` callback, so one list operation opens and closes `dist/index.sqlite` ~10 times, plus the static view resources are not listed lazily. In the stateless HTTP transport this repeats on every POST that lists resources, on a freshly constructed server.
**Impact:** Pure efficiency, not correctness. Repeated open/close of better-sqlite3 handles and re-preparation of statements per kind per request adds avoidable latency and FD churn, magnified by the stateless "new server per POST" model. No leak (every path uses `try/finally { db.close() }`), but no reuse either.
**Recommendation:** For a `resources/list` that fans out across kinds, open one read-only DB handle and reuse it across the kind queries (e.g. pass an optional open `Database` into `queryView`/`querySqlite`, or batch the per-kind selects into one `WHERE kind IN (...)` query). At minimum, consider whether the detail-resource `list` callbacks need to enumerate at all, or whether `list: undefined` (as already used for `claims-by-tag`, server.ts:143) is acceptable for some kinds.
**Effort:** M

### [Low] `query_view` accepts unbounded `query` and `tags` inputs

**Location:** `servers/thinkinglabs-mcp/handlers.ts:14-19` (`queryViewInputSchema`); applied in `store.ts:203-219` `finalizeRows`.
**Observation:** `query` is `z.string().optional()` with no max length, and `tags` is `z.array(z.string()).optional()` with no array-length or per-element cap. `finalizeRows` does a substring scan of every item's full `haystack` (id + title + summary + body_md + JSON-stringified frontmatter + tags) for the query, and an O(items × tags) membership check. The contact matcher deliberately caps its haystack (`handlers.ts:237` `MATCH_TEXT_CAP`), but `query_view` has no equivalent guard.
**Impact:** Minor DoS surface on the public HTTP transport: a large `query` or a large `tags` array forces repeated full-body scans across up to 50 items per request. No injection risk - `query`/`tags` are never interpolated into SQL (SQL filters only on registry-derived `kind` via placeholders, store.ts:169-174). Defer depth to the SECURITY reviewer; flagging here as a contract-completeness gap.
**Recommendation:** Add bounds to the input schema: `query: z.string().max(512).optional()` and `tags: z.array(z.string().max(64)).max(20).optional()`. Cheap and keeps the public tool input self-describing.
**Effort:** S

### [Low] `subscribe_brain_diff` reports `subscribed: true` but cannot subscribe in a stateless server

**Location:** `servers/thinkinglabs-mcp/handlers.ts:127-151`; registered at `server.ts:71-80`.
**Observation:** The tool returns `{ subscribed: true, feeds }` (plus optional recent entries). In stateless Streamable-HTTP there is no session and no server-initiated channel, so nothing is actually subscribed; the server has no way to push diffs. The real semantics are "here are feed URLs to poll." The name and `subscribed: true` over-promise relative to what a stateless transport can deliver.
**Impact:** Design/honesty, not a runtime bug. An agent reading `subscribed: true` may assume push delivery that will never arrive. The behaviour is identical and correct on both transports precisely because it never subscribes to anything.
**Recommendation:** Rename the response field to something like `{ mode: "poll", feeds, ... }` or keep the field but document in the tool `description` (server.ts:75-76) that this returns pollable feed URLs and is not a live subscription. The current description ("Return public brain-diff feed URLs and optionally recent deterministic entries") is honest - align the payload to match.
**Effort:** S

### [Info] `transport.close()` is invoked twice on request teardown

**Location:** `servers/thinkinglabs-mcp-http/server.ts:180-183`.
**Observation:** `res.on("close")` calls `void transport.close()` and `void server.close()`; `server.close()` internally calls `this._transport?.close()` (`shared/protocol.js:500-501`). So the transport is closed twice per request.
**Impact:** Harmless - the official `simpleStatelessStreamableHttp.js` example does the same. `close()` is effectively idempotent on this transport (per-request connection model). Noted only for awareness.
**Recommendation:** Optional: drop the explicit `transport.close()` and rely on `server.close()`, or keep both to match the SDK example. No action required.
**Effort:** S

### [Info] `Transport` cast comment is slightly stale, and SDK now wraps a Web-Standard transport

**Location:** `servers/thinkinglabs-mcp-http/server.ts:185-186` (`as unknown as Transport`).
**Observation:** The comment says the cast is needed "because the SDK getter can return `undefined`." In 1.29, `StreamableHTTPServerTransport` is a Node-compat wrapper around `WebStandardStreamableHTTPServerTransport` (`server/streamableHttp.d.ts:23-25`), implementing `Transport` directly, so `server.connect(transport)` should type-check without the double cast. The cast is defensible defensive code but the rationale may no longer be accurate.
**Impact:** None functionally. Possible unnecessary `as unknown as` that suppresses real type feedback if the SDK shape shifts again.
**Recommendation:** Re-attempt `await server.connect(transport)` without the cast under the current SDK; if it compiles, remove the cast and comment. If it still fails, update the comment to the real reason.
**Effort:** S

### [Info] Stateless HTTP correctness verified - no defects

**Location:** `servers/thinkinglabs-mcp-http/server.ts:171-187`.
**Observation:** Confirmed correct against SDK 1.29: omitting `sessionIdGenerator` enables stateless mode (no session IDs emitted; `webStandardStreamableHttp.js:585-586`); a fresh transport per POST satisfies the SDK's `_hasHandledRequest` reuse guard (`webStandardStreamableHttp.js:137-140`, which throws if a stateless transport is reused); `enableJsonResponse: true` is honoured by the transport, and the transport itself enforces the required `Accept: application/json, text/event-stream` and `Content-Type: application/json` negotiation internally (it returns 406/415, so the bespoke HTTP layer correctly does not duplicate that). 405 on GET/DELETE for stateless is spec-correct (deepwiki-confirmed; matches the bundled example). `initialize` is handled inside the transport. Mcp-Session-Id / MCP-Protocol-Version headers are exposed via CORS (`server.ts:209-211`).
**Impact:** Positive - stateless handling is implemented to spec.
**Recommendation:** None.
**Effort:** -

## Tool/resource contract notes

| Name                                                             | Input schema OK?                                                                                           | Error handling OK?                                                               | Notes                                                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `query_view`                                                     | Mostly - bounded `limit` (1–50), `view` enum excludes `provenance`; `query`/`tags` unbounded (Low finding) | Yes - try/catch returns `isError:true` envelope (handlers.ts:71-80)              | No `outputSchema`; error envelope shape differs from success shape                   |
| `contact.precheck`                                               | Yes - `intent` min(1), optional fields                                                                     | Yes - declines on failure (handlers.ts:90-95)                                    | No `outputSchema`; pure read of `public/contact.json`                                |
| `contact.send`                                                   | Yes - `from` min(3), `subject`/`message`/`intent` min(1)                                                   | Yes - `isError` on decline (handlers.ts:118-124)                                 | No email sent by design; `delivery: "client_handoff"`. No `outputSchema`             |
| `question.submit`                                                | Yes - `questionSlug` min(1) then re-validated against `SAFE_SLUG`; `responder` reuses submission schema    | Yes - rejects bad/unknown slug, traversal-safe (tested handlers.test.ts:197-225) | Writes to `submissions/`; no `outputSchema`                                          |
| `subscribe_brain_diff`                                           | Yes - `since` default `HEAD~20`, `site_url` `z.url()` default                                              | Yes - `subscribed:false`+reason on git failure (handlers.ts:145-150)             | Over-promises "subscribe" in stateless mode (Low finding); no `outputSchema`         |
| Static view resources (×17)                                      | n/a                                                                                                        | Yes - `resourceError` envelope on throw (server.ts:131-136)                      | Consistent `application/json` JSON envelope                                          |
| `claims-by-tag` template                                         | `tag` validated by `RESOURCE_TAG` regex (server.ts:97)                                                     | Yes - `invalid tag` envelope                                                     | `list: undefined` (no enumeration) - good                                            |
| `{kind}/{slug}` detail (×10)                                     | `slug` validated by `RESOURCE_SLUG` regex (server.ts:94)                                                   | Yes - `invalid slug` / `not found` envelopes                                     | `list` callback opens sqlite per kind (Low finding); `provenance` correctly excluded |
| `schema/version`, `ai/current-models`, `predictions/calibration` | n/a                                                                                                        | calibration wrapped in try/catch; the two static ones cannot throw               | Consistent envelopes                                                                 |

## Quick wins (ranked)

1. **Add input bounds to `query_view`** (`query` max length, `tags` array + element caps) - handlers.ts:14-19. (S)
2. **Clarify `subscribe_brain_diff` payload** to reflect poll semantics (rename `subscribed` or lean on the description) - handlers.ts:132-139. (S)
3. **Drop or re-justify the `as unknown as Transport` cast** under current SDK - http server.ts:185-186. (S)
4. **Remove the redundant explicit `transport.close()`** (rely on `server.close()`), or leave as-is to mirror the SDK example. (S)

## Larger refactors (ranked)

1. **Decide and implement the tool output contract** - either declare `outputSchema` per tool (and design the success/error union deliberately) so the SDK validates and publishes the contract, or stop emitting `structuredContent`. This is the single most impactful correctness/design item. (M)
2. **Reduce SQLite handle churn in `resources/list`** - share one read-only `Database` across the per-kind `list` callbacks, or batch into a single `kind IN (...)` query; especially valuable given the stateless "new server per POST" model. (M)

## What's already good (keep)

- Single `createThinkinglabsMcpServer` factory backing both transports; no behaviour duplication between `cli.ts` (stdio) and the HTTP server. Clean split (server.ts:33-91 vs http server.ts).
- Current SDK idioms throughout: `registerTool`/`registerResource` (not the deprecated `tool()`/`resource()`), `ResourceTemplate` for `{slug}`/`{tag}` views, auto-derived capabilities, sensible `name`/`version`.
- Stateless Streamable-HTTP implemented to the letter of the SDK's own stateless example (fresh server+transport per POST, `res.on("close")` cleanup, 405 GET/DELETE, no session generator).
- SQLite lifecycle is leak-free: every query path opens read-only with `fileMustExist: true` and closes in `finally`.
- `dist/index.sqlite` → `content/` fallback returns an identical `ViewItem` shape via shared `makeItem`, so callers see consistent output regardless of source; `source: "sqlite" | "source"` is surfaced honestly in the result envelope.
- Strong input-validation discipline on the write path: `question.submit` re-validates the slug against `SAFE_SLUG` and is path-traversal tested (handlers.test.ts:197-225); resource URIs are regex-guarded before any lookup.
- stdout hygiene is correct for the stdio transport - no `console.*`/`process.stdout` writes anywhere under `servers/`; the HTTP CLI logs only to stderr.
- `provenance` is excluded from public views and the `query_view` enum at multiple layers, with regression tests asserting both the resource and detail reject (handlers.test.ts:347-350).
- Good integration test that drives the real SDK `Client` over `InMemoryTransport` and asserts the full resource/template/tool inventory.

## Open questions for the maintainer

1. Are the MCP tools intended to expose a stable structured output contract to agent clients? If yes, declaring `outputSchema` is the fix; if they're meant to be free-form JSON-in-text, dropping `structuredContent` is cleaner. Which direction?
2. For the stateless HTTP deployment, do you expect `resources/list` traffic frequent enough that the per-kind SQLite open/close matters, or is the cost acceptable given the personal scale?
3. Is `subscribe_brain_diff`'s name a deliberate forward-looking contract (anticipating a future stateful/SSE deployment), or should it be renamed to reflect its current poll-only reality?
