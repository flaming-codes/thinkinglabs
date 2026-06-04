# Deprecated Code Review -- Thinking Labs (2026-06-04)

**Reviewer:** Deprecated Code · **Branch:** feat-design-v2 @ 1e73fd0

---

## Executive Summary

The codebase is in excellent shape with respect to deprecated API usage. The two main libraries with recent, breaking deprecation cycles -- Zod v4 and Vercel AI SDK v6 -- have been fully migrated to their current APIs (`z.url()`, `z.email()`, `z.iso.date()`, `inputSchema` on `tool()`). The MCP SDK correctly uses `registerTool` and `registerResource` (the non-deprecated API), not the `server.tool()` / `server.resource()` shorthands that are now `@deprecated` in SDK 1.29. The Astro markdown pipeline is on the new `processor: unified({})` pattern rather than the deprecated top-level `remarkPlugins` / `rehypePlugins` keys. The only actionable finding is a single deprecated transitive dependency (`prebuild-install`, pulled in by `better-sqlite3`), plus a soft recommendation to migrate from `syntaxHighlight: "prism"` to Shiki for future-proofing. **Overall health rating: Green / low risk.**

---

## Scope and Method

- Static read of all source files under `src/`, `servers/`, `scripts/`, `tests/`, and root config files.
- Verified installed package versions via `node_modules/.pnpm` virtual store and `package.json`.
- Checked `pnpm-lock.yaml` for `deprecated:` annotations.
- Checked MCP SDK 1.29 `.d.ts` declarations in the pnpm store for `@deprecated` JSDoc tags.
- Checked Astro 6.4.2 `dist/types/public/config.d.ts` for deprecated config keys.
- Verified Vercel AI SDK 6.0.193 via exported types and changelog search.
- Web search used to confirm deprecation status of `syntaxHighlight: "prism"`, Three.js import paths, and AI SDK v5/v6 migration notes.
- Docs verified: Astro 6 config reference, AI SDK 6 migration guide, MCP TypeScript SDK 1.29 type declarations, Zod 4 changelog.

---

## Findings

### [Low] `syntaxHighlight: "prism"` -- prefer Shiki for future compatibility

**Location:** `astro.config.mjs:44`

**Deprecated thing:** Prism syntax highlighting (`syntaxHighlight: "prism"`).

**Why / since-when:** Prism is not formally removed or `@deprecated`-annotated in Astro 6, but it is not the default (Shiki is), it does not work with the new Sätteri Rust-based processor (`@astrojs/markdown-satteri`), and the direction of the Astro project is clearly toward Shiki. Prism requires an external CSS stylesheet to be wired in manually; Shiki emits inline styles. The project's CSP policy already notes that Shiki's inline styles are blocked by the current CSP hash strategy, which is the stated reason for keeping Prism -- so this is a known, intentional trade-off, not an oversight.

**Modern replacement:** `syntaxHighlight: "shiki"` (or the object form `{ type: "shiki" }`). Migrating would require updating the CSP `styleDirective` to accommodate Shiki's inline styles, or using Shiki's CSS-variable / external-CSS theme mode.

**Effort:** M (requires CSP coordination)

---

### [Low] `prebuild-install@7.1.3` -- deprecated transitive dependency

**Location:** `pnpm-lock.yaml:3408-3412`

**Deprecated thing:** `prebuild-install` package carries the npm `deprecated` field: "No longer maintained. Please contact the author of the relevant native addon; alternatives are available."

**Why / since-when:** `prebuild-install` is a build helper for native addons. It was abandoned upstream. The project does not depend on it directly; it is pulled in by `better-sqlite3@12.10.0` as a build-time transitive dependency.

**Modern replacement:** `better-sqlite3` itself may drop `prebuild-install` in a future release in favor of its own prebuild mechanism or `node-gyp` alone. No action needed unless `pnpm install` starts emitting warnings or `better-sqlite3` is upgraded to a version that no longer includes it.

**Effort:** S (no action currently needed; monitor `better-sqlite3` upgrade notes)

---

## Quick Wins (Ranked)

1. No immediate quick wins are required. The single actionable item (`prebuild-install`) is a transitive dependency the project cannot control directly.

---

## Larger Migrations (Ranked)

1. **Prism to Shiki** (`astro.config.mjs:44`) -- the CSP interaction makes this a coordinated M effort. When `styleDirective` is already set to `'unsafe-inline'` (it is, see `astro.config.mjs:66`), the blocker is actually already lifted: Shiki's inline styles would be permitted under the current policy. Worth revisiting. Removes the need for an external Prism CSS file.

---

## What's Already Current (Keep)

| Area                      | Current usage                                                                                       | Notes                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Astro content collections | `glob()` loader, `defineCollection`, `getCollection`, `render()` from `astro:content`               | Correct Astro v3+ Content Layer API; no legacy `getEntryBySlug`                                     |
| Astro markdown pipeline   | `processor: unified({ remarkPlugins, rehypePlugins })`                                              | New API; top-level `markdown.remarkPlugins` (which is `@deprecated`) is not used                    |
| Astro client router       | `ClientRouter` from `astro:transitions`                                                             | Correct post-v3 name; no legacy `ViewTransitions` import                                            |
| Zod v4 schemas            | `z.url()`, `z.email()`, `z.iso.date()`, `z.iso.datetime()`                                          | All v4 top-level validators; no v3 `z.string().url()` / `z.string().email()` chains                 |
| Vercel AI SDK v6          | `tool({ description, inputSchema })`, `generateText`, `maxOutputTokens`                             | Correct v6 API; old `parameters` field (pre-v5) is absent                                           |
| MCP SDK 1.29              | `server.registerTool()`, `server.registerResource()`                                                | Non-deprecated API; the `@deprecated` `server.tool()` / `server.resource()` shorthands are not used |
| Node.js module imports    | All use `node:` prefix (`node:fs`, `node:path`, etc.)                                               | Modern specifier form                                                                               |
| Tailwind CSS              | `@import "tailwindcss"`, `@theme inline {}`                                                         | Correct Tailwind v4 syntax; no deprecated v3 `@tailwind base/components/utilities`                  |
| Three.js addon imports    | `three/examples/jsm/controls/OrbitControls.js`                                                      | `three/examples/jsm/*` is still explicitly exported in Three.js 0.184's `package.json`; valid       |
| React                     | `createElement`, `createRoot`, functional components                                                | No `defaultProps` on function components, no legacy context, no string refs                         |
| TypeScript config         | No deprecated `importsNotUsedAsValues`, `noImplicitUseStrict`, `out`, or `keyofStringsOnly` options | Clean for TS 6.x                                                                                    |
| Playwright config         | No deprecated options detected                                                                      | Current `defineConfig` shape                                                                        |

---

## Open Questions for the Maintainer

1. **Prism + CSP:** The comment in `astro.config.mjs:28-33` explains Prism is kept because Shiki uses inline styles that "cannot work with Astro CSP implementation." However, the current `styleDirective` already includes `'unsafe-inline'` (line 66). Is the prism choice still necessary, or was it made before `'unsafe-inline'` was added to the CSP? If the latter, migrating to Shiki would be a simple one-line change.

2. **`@astrojs/markdown-remark` pinned to `7.2.0` (exact, no `^`):** This is in `devDependencies`. Is the exact pin intentional to lock the `unified()` processor API surface, or was it an oversight when the new processor abstraction landed?
