# Security Review - Thinking Labs (2026-06-04)

**Reviewer:** Security · **Branch:** feat-design-v2 @ 1e73fd0

## Executive summary

The codebase is markedly security-conscious for a personal project. The two highest-value attack surfaces are well-defended: the static site ships a real Content-Security-Policy with `script-src 'self'` and hash-based inline-script gating, JSON-LD and embedded JSON payloads are `<`-escaped before injection, and every `child_process` call uses `execFile*`/`spawnSync` with argument arrays (no shell, so no classic command injection). The MCP HTTP server has thoughtfully implemented DNS-rebinding protection, a per-IP token bucket, a 1 MiB body cap, request timeouts, and `405`/`healthz` handling. The most important open issue is structural: the MCP server advertises `auth: "disabled"` and exposes a _write-capable_ tool (`question.submit`) plus a server-side git-walking tool (`subscribe_brain_diff`) through the same factory that backs the public HTTP transport, with unbounded submission-body sizes. The HTTP transport is not currently deployed (DigitalOcean serves a static site only), so these are "harden before you flip it on" items rather than live production vulnerabilities. A few defense-in-depth gaps (CORS wildcard default, error-message echoing, missing input length caps) round out the list.

**Overall security health: Good.**

## Scope & method

Read-only static review. No builds were run. Method: read the MCP HTTP transport (`servers/thinkinglabs-mcp-http/server.ts`, `rate-limit.ts`, `cli.ts`), the shared MCP factory and tool handlers (`servers/thinkinglabs-mcp/server.ts`, `handlers.ts`, `store.ts`), secrets/env handling (`src/lib/env.ts`, `src/lib/llm.ts`, `.env.example`, `.do/app.yaml`), the LLM choke-point, the git wrapper (`src/lib/git.ts`), the content/markdown read paths (`content-repo.ts`, `markdown-walk.ts`, `frontmatter.ts`, `og-image-cache.ts`), output-safety surfaces (JSON-LD via `JsonLd.astro`, `structured-data.ts`, `set:html` call sites, `astro.config.mjs` CSP, the OG image route), and external side-effect scripts (`scripts/linkedin-post.ts`, `src/lib/linkedin-post.ts`). `grep` confirmed the complete `child_process` inventory. Threat model assumed: single-author trusted content; the static site is the public surface today; the HTTP MCP server is a near-future public runtime.

## Findings

### [Medium] Unauthenticated, write-capable MCP tool reachable over the (future) public HTTP transport

**Location:** `servers/thinkinglabs-mcp/server.ts:81-89` (registers `question.submit`), `servers/thinkinglabs-mcp/handlers.ts:156-192` (write to disk), `servers/thinkinglabs-mcp/server.ts:227` (`auth: "disabled"`), wired into HTTP via `servers/thinkinglabs-mcp-http/server.ts:178`.

**Observation:** The same `createThinkinglabsMcpServer` factory backs both the local stdio transport and the public HTTP transport. It registers `question.submit`, which performs `mkdirSync` + `writeJsonState` into `submissions/questions/<slug>/...` on the server's filesystem (`handlers.ts:180-184`). The schema resource self-describes as `auth: "disabled"` (`server.ts:227`). There is no per-tool authorization gate; any client that can POST to `/mcp` can trigger a filesystem write, provided a matching question slug exists.

**Impact:** When the HTTP transport is deployed publicly (the docs and `.env.example` describe exactly that), an anonymous internet caller gains an authenticated-feeling write primitive against the server's disk. Writes are constrained to existing question slugs (`existsSync` gate at `handlers.ts:172`) and a safe slug regex (`handlers.ts:154,161`), so this is not arbitrary-path write, but it is unbounded-volume unsolicited content injected into the curation pipeline (`submissions/` is later triaged). Combined with no body length cap (next finding), it is a disk-fill / spam vector.

**Recommendation:** Before any public HTTP deployment, split the toolset by transport: expose only read tools (`query_view`, `contact.precheck`, `subscribe_brain_diff` without `include_recent`) on the HTTP factory, and keep write/effectful tools (`question.submit`, `contact.send`) on stdio only. Alternatively gate write tools behind a bearer token checked in `servers/thinkinglabs-mcp-http/server.ts` before `transport.handleRequest`. Update the `schema/version` resource so `auth` reflects reality once a gate exists.

**Effort:** M

### [Medium] No length cap on MCP submission/contact text (unbounded disk write + work amplification)

**Location:** `src/schemas/submission.ts:4-15` (`body: z.string().min(1)`, `responder.name: z.string().min(1)`, `pointers: z.array(z.string())` - all without `.max(...)`), consumed by `servers/thinkinglabs-mcp/handlers.ts:179-184`; contact input `servers/thinkinglabs-mcp/handlers.ts:38-44` (`message`/`subject`/`from` have `.min` but no `.max`).

**Observation:** The submission and contact schemas validate presence but not maximum size. Over stdio there is no transport-level body cap at all; over HTTP the 1 MiB cap (`server.ts:37`) bounds a single request, but a ~1 MiB JSON file can still be written per accepted `question.submit`, and the rate limiter (30 burst / 1 RPS) permits a steady stream. The contact `precheck` matcher caps its own haystack at 8 KB (`handlers.ts:237-240`), which shows the author already anticipates hostile-length input elsewhere - the schemas just don't enforce it.

**Impact:** Disk exhaustion / spam amplification on the submissions tree; larger JSON than intended flowing into the human triage queue. Low individual severity, but it compounds the previous finding.

**Recommendation:** Add `.max()` bounds to `submissionSchema` fields (e.g. `body` ≤ 8 KB, `name`/`affiliation`/`contact`/`credentials` ≤ 256, `pointers` ≤ 20 entries of ≤ 512) and to `contactSendInputSchema`/`contactPrecheckInputSchema` (`message` ≤ 8 KB, `subject`/`from`/`intent` ≤ 256). Zod enforces this consistently across stdio and HTTP.

**Effort:** S

### [Low] CORS defaults to `Access-Control-Allow-Origin: *` when no origin allowlist is set

**Location:** `servers/thinkinglabs-mcp-http/server.ts:196-205`; documented as intentional in `docs/agents/mcp-http-server.md` ("When `MCP_HTTP_ALLOWED_ORIGINS` is empty, the server returns `Access-Control-Allow-Origin: *` for ergonomics").

**Observation:** With an empty `allowedOrigins`, every response gets `access-control-allow-origin: *` and DNS-rebinding protection is also off (`server.ts:174` only enables it when an allowlist is non-empty). The default bind is loopback so this is safe locally, but the failure mode is silent: an operator who sets `MCP_HTTP_HOST=0.0.0.0` for public exposure but forgets `MCP_HTTP_ALLOWED_ORIGINS` ends up with a wide-open, browser-reachable, rebinding-vulnerable endpoint.

**Impact:** If misconfigured on a public host, any web origin's JS can call the MCP server from a victim's browser, and DNS-rebinding protection is disabled. Mitigated today only by the loopback default and operator discipline.

**Recommendation:** Make public binding fail closed: if `host` is not a loopback address (`127.0.0.1`/`::1`/`localhost`) and `allowedOrigins`/`allowedHosts` are empty, refuse to start (throw in `cli.ts` or `startMcpHttpServer`) rather than defaulting to `*`. At minimum, log a loud warning when binding non-loopback with empty allowlists.

**Effort:** S

### [Low] HTTP error responses echo internal exception messages to the client

**Location:** `servers/thinkinglabs-mcp-http/server.ts:62` (`sendJsonRpcError(res, 500, "internal error", error)`), `:167` (`error instanceof Error ? error.message : "invalid body"`), and `:269-273` which serializes `cause.message` into JSON-RPC `error.data`; mirrored in tool handlers that return `errorMessage(error)` (`handlers.ts:76,93,122,147,188`) and resource handlers (`server.ts:134,159,205`).

**Observation:** Caught errors propagate their `.message` to the caller. For git/sqlite/fs failures these messages can include absolute filesystem paths, repo-root, or git ref details (e.g. `walkCommits` git errors, `Database` open errors, `readFileSync` ENOENT with full path).

**Impact:** Information disclosure (server paths, repo layout) to unauthenticated callers once the HTTP transport is public. No direct compromise, but it eases reconnaissance.

**Recommendation:** Return a generic message to clients (`"internal error"`) and log the detail server-side via `process.stderr`. Drop the `data: detail` field from the public JSON-RPC error envelope in `sendJsonRpcError`, or only include it when a debug env flag is set.

**Effort:** S

### [Low] Rate-limit key trusts the first `X-Forwarded-For` entry verbatim when proxy trust is enabled

**Location:** `servers/thinkinglabs-mcp-http/server.ts:242-251` (`clientKey`), enabled by `MCP_HTTP_TRUST_PROXY=1`.

**Observation:** With `trustForwardedFor` on, the rate-limit key is `forwarded.split(",")[0].trim()` - the leftmost (client-supplied, spoofable) `X-Forwarded-For` value. A caller can rotate this header per request to mint a fresh token bucket each time and bypass per-IP limiting entirely. The documentation correctly says "only enable behind a known proxy", but a known proxy typically _appends_ to XFF; the leftmost entry is still attacker-controlled unless the proxy strips/overwrites it.

**Impact:** Rate-limit bypass (DoS amplification) when deployed behind a proxy that does not normalize XFF. Defense-in-depth only - the docs already steer operators toward a CDN-level limiter.

**Recommendation:** When trusting a proxy, key off the _rightmost_ trusted hop or a single proxy-injected header you control (e.g. a CDN connecting-IP header), not the leftmost XFF entry. Document that the upstream proxy must overwrite, not append, the header used for keying.

**Effort:** S

### [Low] `subscribe_brain_diff(include_recent=true)` lets an unauthenticated caller drive server-side git walks

**Location:** `servers/thinkinglabs-mcp/handlers.ts:127-151`, `:142` (`walkCommits({ since: args.since, cwd })`), `src/lib/brain-diff.ts:165-204`.

**Observation:** The `since` argument (default `HEAD~20`, caller-overridable, only `z.string()`) drives `git log` and a per-file `git show` walk over the repo. A caller can pass an old date (`--since=2000-01-01` path, `brain-diff.ts:172`) to force the walker across the entire history, parsing frontmatter for every tracked file in every commit. Argument injection is _not_ possible here: non-ref-like values become the single token `--since=<value>` (one argv element, so a leading `--` is data, not a flag), and ref-like values are anchored by `isRefLike` (`brain-diff.ts:160-162`) to `HEAD~N`/sha forms. The concern is compute, not injection.

**Impact:** CPU/IO amplification per request once HTTP is public. Partially mitigated by the 1 RPS token bucket and the 30 s request timeout (`server.ts:78`).

**Recommendation:** Cap the walk: reject `since` values that resolve to more than N commits, or clamp date-based `--since` to a floor (e.g. 90 days). Consider excluding `include_recent` from the HTTP-exposed toolset (see first finding) since it is the one read tool that does real server work.

**Effort:** S

### [Info] Markdown-derived HTML is injected via `set:html`, contained by CSP and the trusted-author model

**Location:** `src/frontend/thinkinglabs-ui/pages/PostDetailPageComposition.astro:67-68,84,130` (`set:html={block.html}` / `note.html`), `IndexHero.astro:24` and `IndexSectionHeader.astro:13` (`set:html={title}`).

**Observation:** Rendered post bodies and a couple of heading props are written as raw HTML. The source is the site owner's own canonical markdown (single-author repo), and the markdown processor is the default Astro/unified pipeline with only freshness plugins added (`astro.config.mjs:43-49`) - no `rehype-raw`/`allowDangerousHtml` was found, so embedded raw HTML in markdown is not specially trusted beyond Astro's defaults. The strong site CSP (`astro.config.mjs:50-71`: `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`) means even an injected `<script>` would not execute.

**Impact:** Under the current trusted-author threat model this is self-XSS at worst. Worth noting only because the pattern would become dangerous if content ever becomes multi-author or reader-submitted content (e.g. `submissions/`) is ever rendered through the same path.

**Recommendation:** Keep the JSON-LD/JSON `<`-escaping discipline (already present). If reader submissions are ever rendered, route them through a sanitizer (`rehype-sanitize`) rather than `set:html`. No change needed today.

**Effort:** S

### [Info] OG image cache filenames are hash-derived, so no path traversal from slugs/titles

**Location:** `src/lib/og-image-cache.ts:35-45` (`routeId = digest(routeSlug).slice(0,16)`, `cacheKey = digest({...})`, `filename = \`${routeId}.${cacheKey}.png\``), consumed by `src/pages/og/[...slug].png.ts:389-407`.

**Observation:** Cache filenames are pure SHA-256 hex; the route slug and content title never land in a path literally, and `writeFileAtomic` resolves under the fixed `.cacheDir`. Stale-variant cleanup matches on the hashed `routeId.` prefix (`og-image-cache.ts:83`), so it cannot delete outside the cache dir. Titles fed to Satori are plain text and truncated to 140 chars (`[...slug].png.ts:545,667,704-711`); Satori does not interpret HTML. No traversal or injection vector. Listed as a positive to record that this surface was checked.

**Impact:** None.

**Recommendation:** None.

**Effort:** S

## Quick wins (ranked)

1. **Add `.max()` length caps** to `src/schemas/submission.ts` and the contact input schemas in `handlers.ts` (Medium → cheap; closes the disk-fill/spam vector across both transports). Effort S.
2. **Fail closed on public binding without allowlists** in `servers/thinkinglabs-mcp-http/cli.ts`/`server.ts` (Low; eliminates the silent CORS-`*` + rebinding-off misconfig). Effort S.
3. **Stop echoing exception `.message` to HTTP clients** - drop `error.data` from `sendJsonRpcError` and log server-side (Low; information disclosure). Effort S.
4. **Clamp the `subscribe_brain_diff` walk** (max commits or date floor) in `handlers.ts` (Low; compute DoS). Effort S.
5. **Key the rate limiter off a proxy-controlled hop**, not leftmost XFF, in `clientKey` (Low; rate-limit bypass). Effort S.

## Larger hardening (ranked)

1. **Split the MCP toolset by transport** (read-only on HTTP; write/effectful on stdio) or add a bearer-token gate in the HTTP server before `transport.handleRequest`, and make `schema/version.auth` reflect it. This is the single most important item before any public HTTP deployment. Effort M.
2. **Introduce a transport-agnostic input-size and rate policy** in the shared factory so stdio and HTTP enforce identical bounds (today only HTTP has the 1 MiB cap; stdio has none). Effort M.
3. **Add a security regression test suite for the HTTP server**: oversized body rejection, 405 on GET/DELETE, host/origin allowlist enforcement, rate-limit exhaustion, and error-message redaction. Effort M.

## What's already good (keep)

- **CSP is real and tight** (`astro.config.mjs:50-71`): `default-src 'self'`, `script-src 'self'` with SHA-256 hashing, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`. `inlineStylesheets: "never"` is a deliberate CSP-friendly choice.
- **JSON-LD and embedded JSON are `<`-escaped** before injection (`JsonLd.astro:9`, `NetworkGraph3D.astro:32`), defeating `</script>` and `<!--` breakout.
- **No shell anywhere**: every subprocess uses `execFile*`/`spawnSync` with arg arrays (`src/lib/git.ts`, `src/lib/editor.ts`); `subscribe_brain_diff`'s user-controlled `since` is argument-injection-safe by construction.
- **Secrets hygiene**: `.env.example` ships empty keys with clear provider guidance; `src/lib/llm.ts:61-63,106` gates every network call behind `isLLMAvailable()` (no key → throw, no call); keys are never logged. `scripts/linkedin-post.ts`/`linkedin-post.ts` keep the bearer token out of dry-run output and require explicit `--yes` to publish.
- **MCP input validation**: Zod raw-shapes on every tool (`handlers.ts:14-51`), anchored slug/tag regexes on resource templates (`server.ts:94,97`, `handlers.ts:154`), `existsSync` gate before writes, SQLite parameterized queries throughout `store.ts` (`?` placeholders), readonly DB handles.
- **HTTP transport hardening**: 1 MiB body cap with Content-Length pre-check (`server.ts:37,215-232`), 30 s request timeout, `clientError` socket teardown, token bucket with idle eviction, `405` + `Allow` header on GET/DELETE, rate-limit-bypassing `healthz`, stateless per-POST server lifecycle with `res.on("close")` cleanup.
- **`og-image-cache`** uses hash-derived filenames and atomic temp-file writes - no traversal, no partial-file races.

## Open questions for the maintainer

1. Will the HTTP MCP transport ever be deployed publicly, and if so, should `question.submit` / `contact.send` be reachable over it at all? The answer drives whether finding #1 is Medium-urgent or can stay deferred.
2. Is `submissions/` content ever rendered back onto the site (now or planned)? If yes, the `set:html` Info finding escalates to a real stored-XSS path that needs sanitization.
3. For public HTTP exposure, is the intended fronting layer a CDN (Cloudflare) that normalizes `X-Forwarded-For`? That determines the correct rate-limit keying fix in finding #5.
