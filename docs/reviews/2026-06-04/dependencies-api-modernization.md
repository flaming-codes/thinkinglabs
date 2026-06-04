# Dependency & API Modernization Review - Thinking Labs (2026-06-04)

**Reviewer:** Dependencies/API · **Branch:** feat-design-v2 @ 1e73fd0

## Executive summary

This codebase is, on the whole, impressively current. The Vercel AI SDK choke-point (`src/lib/llm.ts`) is written to genuine v6 idioms (`inputSchema`, `maxOutputTokens`, object-form `toolChoice`, `.input` on tool calls, `LanguageModel` type), the Zod schemas are pure Zod 4 (top-level `z.url()`/`z.email()`/`z.iso.date()`, two-arg `z.record`, `z.coerce`), the MCP servers use the current `registerTool`/`registerResource`/`ResourceTemplate` API, Tailwind is on the v4 CSS-first model with `@tailwindcss/vite` and `@theme`, and Astro 6 Content Layer (`glob()` loaders) plus the stable `fonts` API are used correctly. No v4/v5-era AI SDK patterns, no Zod-3-isms, and no legacy MCP `server.tool()` calls were found. The findings below are therefore mostly modernization-hygiene and dead-dependency items rather than correctness regressions. The two most material items are (1) several three.js-ecosystem dependencies that appear to be declared at top level but never imported by app code, and (2) the `@astrojs/react` integration carried even though there are no Astro React islands. **Overall modernization health: A- (Strong / current).**

## Scope & method

Static read + grep over `src/`, `servers/`, `scripts/`, `astro.config.mjs`, `tsconfig.json`, `package.json`, plus inspection of installed `node_modules` package manifests and `.d.ts`/`.js` to confirm runtime behaviour. No builds run. Library idioms were verified against:

- Installed source: Astro 6.4.2 config schema (`node_modules/astro/dist/core/config/schemas/base.js`), `@astrojs/markdown-remark@7.2.0`, `ai@6.0.193` `dist/index.d.ts`, `@ai-sdk/openai@3.0.67`, `@modelcontextprotocol/sdk@1.29.0`, `@astrojs/react@5.0.6`, `@shadergradient/react@2.4.20`, `@react-three/fiber@9.6.1`.
- DeepWiki Q&A for `vercel/ai`, `modelcontextprotocol/typescript-sdk`, `withastro/astro` (cross-checked against installed source; one DeepWiki claim about `markdown.processor`/`fontProviders.npm` was stale and is corrected below).
- Context7 was attempted but its monthly quota was exhausted; installed-source verification was used instead, which is authoritative for the pinned versions.

## Findings

### [Medium] Three.js-ecosystem deps declared but never imported by app code

**Location:** `package.json` deps `@react-three/fiber` ^9.6.1, `camera-controls` ^3.1.2, `three-stdlib` ^2.36.1; usage search across `src/`.
**Observation:** App code imports `three` directly (`NetworkGraph3D.client.ts`, importing `OrbitControls` from `three/examples/jsm/...`) and `@shadergradient/react` (`EntityShaderGradient.ts`). Grep finds **zero** direct imports of `@react-three/fiber`, `camera-controls`, or `three-stdlib` in `src/`/`servers/`/`scripts/` (only `d3-force-3d` and `three` are directly used). `@shadergradient/react` internally imports `@react-three/fiber` and `three` but declares neither as a dependency nor a peer (its `package.json` has empty `dependencies` and only `react`/`react-dom` peers). So `@react-three/fiber` is effectively an undeclared peer that the app must satisfy at top level - keep it. `camera-controls` and `three-stdlib` are referenced only inside one shadergradient dist chunk; they are likewise undeclared-but-required transitively. The net effect: these three are load-bearing only as manual peer satisfaction for `@shadergradient/react`, not because app code uses them.
**Current-best-practice:** Top-level deps should be ones the app imports, or documented peer-satisfaction shims. Hidden coupling to a dependency's undeclared imports is fragile across `@shadergradient/react` upgrades.
**Recommendation:** Keep `@react-three/fiber`/`camera-controls`/`three-stdlib`/`three` (removing them breaks shadergradient), but add a one-line comment in `package.json` or a note in `docs/` that they exist to satisfy `@shadergradient/react`'s undeclared imports. Re-verify after any `@shadergradient/react` bump. Do not attempt to drop them without testing the shader surface.
**Effort:** S (documentation) / M (if you later replace shadergradient).

### [Low] `@astrojs/react` integration carried with no Astro React islands

**Location:** `astro.config.mjs:35` (`integrations: [react()]`); confirmed: no `client:*` directives anywhere in `src/`, no `.astro` file imports a React component, no `.tsx`/`.jsx`/`.mdx` files exist.
**Observation:** The only React usage is `EntityShaderGradient.ts` (a `.ts` file using `createElement`, no JSX), mounted manually via `react-dom/client` `createRoot` inside `EntityShaderSurface.client.ts`. That is plain Vite + React, not an Astro island. The `@astrojs/react` integration's primary job (compiling `.jsx`/`.tsx` islands and wiring `client:*` hydration) is unused here. It does still provide the React Vite plugin / dedupe config, which is why the manual `createRoot` path works.
**Current-best-practice:** Pull integrations you actually use; for manual React mounting you can configure `@vitejs/plugin-react` (or rely on Vite's esbuild for `createElement`-only code) without the Astro renderer layer.
**Recommendation:** Low priority - the integration is harmless and the safe default. If you want to trim it, add `@vitejs/plugin-react` to the existing `vite.plugins` array and drop `@astrojs/react`, then verify the shader surface still hydrates. Given the code uses `createElement` (no JSX), even a bare Vite React setup suffices. Keep as-is unless trimming the dependency surface is a goal.
**Effort:** M (needs a hydration smoke test).

### [Low] Forced-tool `generateText` where `generateObject` is the v6-idiomatic fit

**Location:** `src/lib/llm.ts:103-140` (`runToolCall`).
**Observation:** `runToolCall` does a single forced tool call (`toolChoice: { type: "tool", toolName }`, a `tool()` with `inputSchema` and no `execute`) purely to extract one structured object, then re-`safeParse`s `call.input` against the same schema. This is correct v6 (the API names are all current), but the AI SDK ships `generateObject` precisely for "one structured object out", which removes the tool-plumbing, the `toolChoice`, the `result.toolCalls.find(...)`, and the manual re-parse. The re-parse is currently belt-and-suspenders: `result.toolCalls` is typed `TypedToolCall` (a union including `DynamicToolCall` with `input: unknown`), so `.find()` widens to `unknown` and the `safeParse` is needed for narrowing - `generateObject` returns a typed `object` directly and avoids that dance.
**Current-best-practice:** `const { object } = await generateObject({ model, schema, system, prompt, maxOutputTokens })` for single-object structured output.
**Recommendation:** Consider migrating `runToolCall` to `generateObject` (keep the `{ data, model }` return contract and the timeout/availability guards). Behavioural note: `generateObject` uses the provider's structured-output/JSON mode rather than tool-calling, which can change failure modes slightly - worth a test pass against the agent CLIs. Optional; current code is correct.
**Effort:** M.

### [Low] MCP `inputSchema` passed as raw Zod shape (deprecated overload, auto-wrapped)

**Location:** `servers/thinkinglabs-mcp/handlers.ts:14-51` (`queryViewInputSchema` etc. are raw shapes `{ field: z.… }`), consumed at `servers/thinkinglabs-mcp/server.ts:42-89` `registerTool(..., { inputSchema })`.
**Observation:** The tool input schemas are bare Zod raw-shape objects, not `z.object(...)`. The MCP SDK 1.29 still accepts a raw shape on `registerTool` and auto-wraps it with `z.object()`, but that overload is documented as the deprecated/back-compat path; the recommended shape is a `ZodObject` (`StandardSchemaWithJSON`). This is purely an SDK-ergonomics nit - it works today.
**Current-best-practice:** Pass `inputSchema: z.object({ … })` (or wrap the existing shapes at the call site).
**Recommendation:** Wrap each raw shape in `z.object(...)` either where defined in `handlers.ts` or at the `registerTool` call. The inferred-input type aliases already do `z.infer<z.ZodObject<typeof …>>`, so wrapping the value to match is a small, type-safe change. Defer until the SDK actually drops the overload.
**Effort:** S.

### [Info] CLIs hand-roll arg parsing instead of Node 22 `util.parseArgs`

**Location:** ~14 `scripts/*.ts` files each define a private `parseArgs` (e.g. `scripts/brain-diff.ts:25`, `scripts/review-proposals.ts:38`, `scripts/derive-claims.ts:86`, plus dormant-flip/freshness-review/resolve-predictions/triage-questions/review-decisions/review-stale-claims/linkedin-post).
**Observation:** Each CLI re-implements flag parsing over `process.argv.slice(2)`. Node >=22.19 ships stable `util.parseArgs`, which the engines field already guarantees. No external arg lib is used (good - no `minimist`/`yargs`/`commander`), but the hand-rolled parsers duplicate logic and each enforces "reject unknown flags" slightly differently.
**Current-best-practice:** `import { parseArgs } from "node:util"` with a shared `options` config, or a tiny shared helper in `src/lib/`.
**Recommendation:** Optional consolidation: a single `src/lib/cli-args.ts` wrapping `node:util` `parseArgs` would remove ~14 near-duplicate parsers and standardize the "unknown flag → exit 2" behaviour. Not urgent; current parsers are small and tested.
**Effort:** M.

### [Info] `@types/node` ^25 is ahead of the Node 22 runtime floor

**Location:** `package.json` devDeps `@types/node` ^25.9.1 (installed 25.9.1); `engines.node` `>=22.19.0`; `tsconfig.json` `types: ["node"]`.
**Observation:** `@types/node@25` types APIs from Node 25, while the supported/deployed runtime floor is Node 22.19. TypeScript will happily accept Node-23/24/25-only APIs (e.g. newer `node:sqlite`, `fs`/`stream` additions) that would throw at runtime on a 22.x deploy.
**Current-best-practice:** Pin `@types/node` to the runtime major you actually run (here, `^22`) so the type surface matches the floor.
**Recommendation:** Consider `@types/node` `^22` to match `engines`. Low risk either way since the code uses only stable, long-present builtins, but aligning prevents a future "compiles locally, crashes on the Node 22 host" gap.
**Effort:** S.

### [Info] `vitest` and `vite-plus` pinned to floating/`latest` ranges

**Location:** `package.json`: `vite-plus: "latest"`; `vitest: "npm:@voidzero-dev/vite-plus-test@^0.1.23"` (also in `pnpm.overrides`); installed `vite-plus@0.1.23`.
**Observation:** `vite-plus: "latest"` means `pnpm install` can pull a new toolchain major at any time with no lockfile guard intent (the lockfile pins the resolved version, but `latest` invites drift on the next update). The Vitest shim is a pre-1.0 `0.1.x` package, expected for a brand-new toolchain but inherently churny.
**Current-best-practice:** Pin dev toolchain to a caret/explicit range so upgrades are deliberate, not incidental.
**Recommendation:** Replace `"latest"` with the current resolved range (e.g. `^0.x` or an exact pin) once the toolchain stabilizes. Accept the `0.1.x` Vitest shim as a known early-adopter cost; re-evaluate when it hits a stable line. The CLAUDE.md "run vp install after pulling" note already mitigates surprise.
**Effort:** S.

### [Info] `node:sqlite` exists on the Node 22 floor but `better-sqlite3` remains the right call

**Location:** `src/index/builder.ts:3`, `servers/thinkinglabs-mcp/store.ts:3` (`import Database from "better-sqlite3"`).
**Observation:** Node 22 ships an experimental `node:sqlite`. The index layer uses `better-sqlite3` (a native addon, in `pnpm.onlyBuiltDependencies`) with its mature synchronous API.
**Current-best-practice:** For a build-time/agent-only index where `better-sqlite3` is already wired and proven, staying put is correct; `node:sqlite` is still flagged experimental and would remove a native build step but add API churn risk.
**Recommendation:** No action. Revisit only if/when `node:sqlite` stabilizes and the native-addon build (node-gyp, prebuilds) becomes a real maintenance cost. Documented here so it's a conscious choice.
**Effort:** L (and not recommended now).

### [Info] `markdown.processor` + `fontProviders.npm` are valid advanced Astro 6 APIs (no action; DeepWiki was wrong)

**Location:** `astro.config.mjs:4` (`import { unified } from "@astrojs/markdown-remark"`), `:43-49` (`markdown.processor`), `:14-26` (`fonts` with `fontProviders.npm`).
**Observation:** Verified against installed Astro 6.4.2 source: `markdown.processor` IS a real config key (`schemas/base.js:255`, schema `default(() => unified())`), and `@astrojs/markdown-remark@7.2.0` exports the matching `unified(opts)` helper (`dist/processor.js:1`). `fontProviders.npm` IS a real provider (`dist/assets/fonts/providers/index.js:129-140`). A DeepWiki answer claimed both were invalid - that was stale; the installed source is authoritative and the config is correct. One caveat: `@astrojs/markdown-remark` is pinned to exact `7.2.0` (no `^`), a deliberate lockstep with Astro's internal markdown package.
**Current-best-practice:** Using `markdown.processor` is the advanced path; the common path is top-level `markdown.remarkPlugins`/`rehypePlugins`. Both are supported.
**Recommendation:** No change required. Keep the exact `@astrojs/markdown-remark@7.2.0` pin in lockstep with `astro` minor bumps (it imports Astro internals); add a comment noting why it is exact-pinned so a future "use carets everywhere" sweep does not loosen it.
**Effort:** S (optional comment).

## Dependency-by-dependency notes

| Package                                                    | Current usage                                                                                                          | Modern?                                                                          | Action                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `ai` ^6.0.193                                              | `runToolCall` via `generateText`+`tool()`, forced `toolChoice`, `.input`, `maxOutputTokens`                            | Yes - true v6 idioms                                                             | Optional: switch to `generateObject` (Low finding)   |
| `@ai-sdk/openai` ^3.0.67                                   | `openai()` + `createOpenAI()` for Ollama-compatible endpoint                                                           | Yes - current exports; peer accepts Zod 4                                        | None                                                 |
| `@modelcontextprotocol/sdk` ^1.29.0                        | `McpServer` + `registerTool`/`registerResource`/`ResourceTemplate`; stateless `StreamableHTTPServerTransport` per POST | Yes - current API; stateless pattern correct                                     | Wrap tool `inputSchema` in `z.object()` (Low)        |
| `zod` ^4.4.3                                               | Schemas + env + MCP inputs                                                                                             | Yes - pure Zod 4 (`z.url`, `z.email`, `z.iso.date`, `z.record(k,v)`, `z.coerce`) | None                                                 |
| `astro` ^6.4.2                                             | Content Layer `glob()` loaders, stable `fonts`, `markdown.processor`, CSP, prerender-everything                        | Yes                                                                              | None                                                 |
| `@astrojs/react` ^5.0.6                                    | Integration present; no islands, no `client:*`, manual `createRoot` only                                               | Functional but arguably unused-as-integration                                    | Optionally replace with bare Vite React (Low)        |
| `react` / `react-dom` ^19.2.6                              | `createElement` + `react-dom/client` `createRoot` (no JSX, no legacy `ReactDOM.render`/`forwardRef`/PropTypes)         | Yes - React 19-clean                                                             | None                                                 |
| `@shadergradient/react` ^2.4.20                            | `ShaderGradient`/`ShaderGradientCanvas` via `createElement`, lazy-mounted                                              | Yes                                                                              | None; note its undeclared three/fiber imports        |
| `three` ^0.184                                             | Direct scene in `NetworkGraph3D.client.ts`; `OrbitControls` from `three/examples/jsm`                                  | Yes                                                                              | None                                                 |
| `@react-three/fiber` ^9.6.1                                | No direct app import; required transitively by shadergradient                                                          | Peer-satisfaction only                                                           | Document why it's top-level (Medium)                 |
| `camera-controls` ^3.1.2                                   | No direct app import; referenced in shadergradient dist                                                                | Peer-satisfaction only                                                           | Document / re-verify on shadergradient bump (Medium) |
| `three-stdlib` ^2.36.1                                     | No direct app import; referenced in shadergradient dist                                                                | Peer-satisfaction only                                                           | Document / re-verify on shadergradient bump (Medium) |
| `d3-force-3d` ^3.0.6                                       | `network-graph-layout.ts` build-time layout; local `.d.ts` shim                                                        | Yes (untyped lib, shimmed)                                                       | None                                                 |
| `satori` ^0.26 / `@resvg/resvg-js` ^2.6 / `sharp` ^0.34.5  | OG route: `satori()` → `new Resvg(svg).render().asPng()` → `sharp().resize().toBuffer()`                               | Yes - current APIs                                                               | None                                                 |
| `gray-matter` ^4                                           | Frontmatter parse (strict wrapper)                                                                                     | Standard; no native replacement                                                  | None                                                 |
| `better-sqlite3` ^12.10                                    | Index + MCP store (sync API)                                                                                           | Yes                                                                              | None (see `node:sqlite` Info)                        |
| `unified` ^11 / `remark-parse` ^11 / `unist-util-visit` ^5 | Custom remark/rehype freshness plugins                                                                                 | Yes                                                                              | None                                                 |
| `tailwindcss` ^4.3 / `@tailwindcss/vite` ^4.3              | `@import "tailwindcss"` + `@theme inline`; no `tailwind.config.*`                                                      | Yes - v4 CSS-first                                                               | None                                                 |
| `@fontsource/golos-text` ^5.2.8                            | Consumed via `fontProviders.npm`                                                                                       | Yes                                                                              | None                                                 |
| `@astrojs/markdown-remark` 7.2.0 (exact)                   | `unified()` helper for `markdown.processor`                                                                            | Yes; exact-pin intentional                                                       | Comment the exact pin (Info)                         |
| `@types/node` ^25                                          | TS types                                                                                                               | Ahead of Node 22 floor                                                           | Consider `^22` (Info)                                |
| `vite-plus` `latest` / vitest shim `0.1.x`                 | Toolchain                                                                                                              | Early-adopter; floating                                                          | Pin `vite-plus` (Info)                               |
| `tsx` ^4.22                                                | Runs `scripts/*` and MCP CLIs                                                                                          | Fine; Node 22 native TS strip is experimental                                    | None                                                 |

## Quick wins (ranked)

1. **Document the three-ecosystem peer-satisfaction deps** (`@react-three/fiber`, `camera-controls`, `three-stdlib`) so nobody "cleans them up" and breaks the shader surface. (S)
2. **Wrap MCP tool `inputSchema` values in `z.object(...)`** to move off the deprecated raw-shape overload. (S)
3. **Pin `vite-plus` off `"latest"`** to the resolved range. (S)
4. **Align `@types/node` to `^22`** with the runtime floor. (S)
5. **Comment the exact `@astrojs/markdown-remark@7.2.0` pin** explaining the Astro-internal lockstep. (S)

## Larger upgrades (ranked)

1. **Migrate `runToolCall` from forced-tool `generateText` to `generateObject`** - drops the tool plumbing and manual re-parse, more idiomatic v6. Needs a regression pass over the agent CLIs because it switches from tool-calling to structured-output mode. (M)
2. **Consolidate the ~14 hand-rolled `parseArgs` into a `node:util` `parseArgs` helper.** Removes duplication, standardizes unknown-flag handling. (M)
3. **Optionally drop `@astrojs/react`** in favour of a bare Vite React plugin, since there are no Astro islands - only worth it as a deliberate dependency-trim with a hydration smoke test. (M)
4. **Re-evaluate `node:sqlite`** only once it leaves experimental, to shed the native-addon build. Not recommended now. (L)

## What's already good (keep)

- AI SDK v6 usage is genuinely current: `inputSchema`, `maxOutputTokens`, object `toolChoice`, `.input`, `LanguageModel` type, `maxRetries`, per-call timeout guard, and an LLM availability guard. No `parameters`/`maxTokens`/`.args`/v5 leftovers.
- Zod is pure v4 across schemas, env, and MCP inputs - no v3 error-map/`invalid_type_error`/`nativeEnum`/`z.string().url()` carryover.
- MCP servers use the current `registerTool`/`registerResource`/`ResourceTemplate` API and a textbook stateless Streamable-HTTP setup (fresh server+transport per POST, `enableJsonResponse`, DNS-rebinding + CORS + rate-limit + body cap on raw `node:http`, no Express).
- Astro 6 Content Layer (`glob()` loaders), stable `fonts` API, prerender-everything contract, and CSP config are all modern and internally consistent.
- React is 19-clean: no `forwardRef`/`PropTypes`/`defaultProps`/`ReactDOM.render`; uses `react-dom/client` `createRoot` with explicit `unmount` teardown on `astro:before-swap`.
- Tailwind v4 CSS-first (`@import "tailwindcss"`, `@theme inline`, no legacy JS config).
- No `node-fetch`/`cross-fetch`/`structuredClone` polyfills, no `minimist`/`yargs`/`commander` - Node builtins and native `fetch` are relied on.
- satori/resvg/sharp OG pipeline uses current APIs.

## Open questions for the maintainer

1. Are `@react-three/fiber`, `camera-controls`, and `three-stdlib` intentionally top-level to satisfy `@shadergradient/react`'s undeclared imports, or leftovers from an earlier r3f-based graph implementation that was rewritten to vanilla three.js (`NetworkGraph3D.client.ts`)? If the latter, only `@react-three/fiber` is strictly needed for shadergradient.
2. Is the `@astrojs/react` integration kept on purpose for future islands, or could the project move to a bare Vite React plugin given there are currently no `client:*` islands?
3. Was the exact `@astrojs/markdown-remark@7.2.0` pin chosen to match a specific `astro` minor, and is there a process to bump them together?
4. Is `runToolCall`'s forced-tool approach a deliberate choice (e.g. for provider compatibility with Ollama's OpenAI-compatible endpoint) over `generateObject`, or just historical? This matters before recommending the `generateObject` migration.
