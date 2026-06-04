# Legacy Remnants Review - Thinking Labs (2026-06-04)

**Reviewer:** Legacy Remnants
**Branch:** feat-design-v2 @ 1e73fd0
**Date:** 2026-06-04

---

## Executive Summary

The Storybook removal (commit `1e73fd0`) was largely complete: all config files, story files, storybook fixture Astro components, and the `docs/agents/storybook.md` doc were deleted, and the corresponding `package.json` scripts/deps and `.gitignore` entries were cleaned up. No dangling `import` or `require` references to Storybook survive in the live codebase.

The main legacy debt is in documentation and agent-facing config, not source code. Three groups of docs (`docs/conventions/components.md`, `docs/agents/rendering-pipeline.md`, and the replicated system prompt in `AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md` / `.harness/src/prompts/system.md`) still describe the old `src/components/` quartet (`StatusPill`, `Tags`, `MetaBlock`, `EmptyState`) as the shared rendering primitives, even though three of those four components no longer exist. A related reference to "the Base layout's CSS" in `docs/conventions/components.md` is also stale.

Two config-level issues deserve attention: (1) the agent-facing system prompt refers to `vite.config.ts` but the file is `vite.config.js`, and (2) `.codex/config.toml` and `.harness/src/settings/codex.toml` hardcode a stale absolute path (`/Users/tom/Code/thinkinglabs`) and a stale Node version (`v23.3.0`), which diverges from the repo's current location (`/Users/tom/Github/thinkinglabs`) and engine constraint (`>=22.19.0`).

**Overall cleanliness rating: 8/10.** The code itself is clean. The issues that remain are confined to documentation, agent config text, and one developer-machine-specific TOML, none of which break the build or affect end users.

---

## Scope and Method

- Static file reads and `grep` across the full working tree (excluding `node_modules/`, `dist/`, `.git/`).
- `git diff` and `git log` to understand what was deleted and when.
- Files examined: `package.json`, `tsconfig.json`, `.gitignore`, `astro.config.mjs`, `vite.config.js`, `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.harness/src/**`, `docs/**`, `src/components/`, `src/frontend/thinkinglabs-ui/`, `.codex/`, `.vscode/`, `.playwright-mcp/`, `.vite-hooks/`, `tests/`, `scripts/`, `servers/`.
- No builds were run; findings are based on static analysis only.

---

## Findings

### [High] Stale component inventory in agent-facing system prompt

**Location:**

- `.harness/src/prompts/system.md:88`
- `AGENTS.md:88`
- `CLAUDE.md:88`
- `.github/copilot-instructions.md:88`

**Remnant:** Design-v1 shared component set.

**Impact:** Every AI agent (Codex, Claude Code, Copilot) reading the system prompt is told that `StatusPill.astro`, `Tags.astro`, and `MetaBlock.astro` exist in `src/components/` and should be used for new page rendering. None of these three files exist. An agent following this guidance will produce broken imports. `EmptyState.astro` is the only one of the four that survived the migration.

**Recommendation:** Update the Rendering section of `.harness/src/prompts/system.md` to reflect the new model: `src/components/` holds `EmbeddedTool`, `EmptyState`, `JsonLd`, and `PwaHead` (infrastructure/utility layer), while the design system primitives live under `src/frontend/thinkinglabs-ui/components/`. Run `pnpm harness apply` after editing the source to regenerate `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`.

**Effort:** S

---

### [High] Stale component docs in docs/conventions/components.md

**Location:**

- `docs/conventions/components.md:5-8` (entire component list section)
- `docs/conventions/components.md:5` ("Color is keyed off `data-status` in the Base layout's CSS")

**Remnant:** Design-v1 `StatusPill`, `MetaBlock`, `Tags` + old Base layout.

**Impact:** The doc's central guidance ("reach for them before introducing kind-specific markup") points at three components that no longer exist. A developer following it will write broken code. The Base layout CSS reference is also stale - the Base layout was removed (confirmed by `tests/client-router-styles.test.ts:13`).

**Recommendation:** Rewrite this file to document the new v2 primitive layer: `StatusTag.astro`, `EntityDetail.astro`, `EntityFacts.astro`, `EntitySection.astro`, etc. in `src/frontend/thinkinglabs-ui/components/`, and the surviving utility components in `src/components/`.

**Effort:** S

---

### [High] Stale component reference in docs/agents/rendering-pipeline.md

**Location:** `docs/agents/rendering-pipeline.md:5`

**Remnant:** Same as above - the four-component list in `src/components/`.

**Impact:** Agent and developer documentation for the rendering pipeline references the old v1 components.

**Recommendation:** Update the sentence to describe the new rendering layer.

**Effort:** S

---

### [Medium] `vite.config.ts` referenced in system prompt, file is `vite.config.js`

**Location:**

- `.harness/src/prompts/system.md:27`
- `AGENTS.md:27`
- `CLAUDE.md:27`

**Remnant:** The file was renamed from `vite.config.ts` to `vite.config.js` in commit `edeb920` (May 2026). The mandatory quality-gates checklist still says `vite.config.ts`.

**Impact:** Low - the mention is in a guidance checklist, not an import path, so it does not break anything. But agents reading the checklist and trying to verify tasks against `vite.config.ts` will look at the wrong filename.

**Recommendation:** Change `vite.config.ts` to `vite.config.js` in `.harness/src/prompts/system.md`, then run `pnpm harness apply`.

**Effort:** S (one-word edit + harness apply)

---

### [Medium] Hardcoded stale absolute path and Node version in Codex config

**Location:**

- `.harness/src/settings/codex.toml:8` (source of truth)
- `.codex/config.toml:17` (generated output)

**Remnant:** PATH bakes in `/Users/tom/Code/thinkinglabs/node_modules/.bin` (old repo location) and `v23.3.0` (old Node version).

**Impact:** Codex environment actions may fail or silently use wrong binaries if the old path does not resolve. The repo is currently at `/Users/tom/Github/thinkinglabs`, and `package.json` requires Node `>=22.19.0` (not a specific patch). Using `v23.3.0` in PATH means the Codex sandbox will only work if exactly that version is installed at that NVM path.

**Recommendation:** Update the PATH in `.harness/src/settings/codex.toml` to use `$PWD/node_modules/.bin` (or the current repo path) and drop the hardcoded Node version in favor of whatever `nvm use` or `PATH` resolution provides from the project's `.nvmrc` / `engines` field. Run `pnpm harness apply` to regenerate `.codex/config.toml`.

**Effort:** S

---

### [Low] `docs/conventions/components.md` - "Base layout's CSS" reference

**Location:** `docs/conventions/components.md:5`

**Remnant:** Design-v1 Base layout (superseded by `ThinkinglabsUiPage.astro` and the v2 design system).

**Impact:** Purely documentary. Any developer who reads this and tries to add a new status value by "keying off `data-status` in the Base layout's CSS" will not find it. The v2 system uses `StatusTag.astro` with its own scoped styles.

**Recommendation:** Replace with a description of how `StatusTag` handles status variants in v2.

**Effort:** S (part of the broader components.md rewrite above)

---

### [Low] `EmptyState.astro` is unreferenced but retained

**Location:** `src/components/EmptyState.astro`

**Remnant:** Design-v1 listing page utility. The v2 design uses composition components in `src/frontend/thinkinglabs-ui/pages/` that handle empty states inline.

**Impact:** Dead file. Zero callers exist anywhere in `src/`. It does not affect the build (Astro components that are never imported are never rendered), but it adds noise to `src/components/`.

**Recommendation:** Delete `src/components/EmptyState.astro` unless v2 listing compositions are planned to adopt it.

**Effort:** S

---

### [Low] `.playwright-mcp/` directory is not gitignored

**Location:** `.playwright-mcp/console-2026-05-09T19-40-44-305Z.log`

**Remnant:** A Playwright MCP session log file from May 9, 2026. The directory is not listed in `.gitignore`. The file itself is not git-tracked (confirmed via `git ls-files`), but there is no rule preventing accidental future tracking.

**Impact:** Noise. No build or runtime impact.

**Recommendation:** Add `.playwright-mcp/` to `.gitignore`.

**Effort:** S (one-line gitignore entry)

---

### [Info] `.codex/environments/environment.toml` header says "DO NOT EDIT MANUALLY"

**Location:** `.codex/environments/environment.toml:1`

**Remnant:** Codex-generated config. The comment says this is autogenerated, which conflicts with the fact that `.codex/` is tracked in git (the `.harness/` system does not manage `.codex/environments/`). This is a minor documentation inconsistency, not a build issue.

**Impact:** None.

**Recommendation:** If this file is truly generated from a Harness entity, wire it into the harness workflow. If it is hand-maintained, remove the "DO NOT EDIT MANUALLY" header.

**Effort:** S

---

### [Info] `seo.test.ts` test named "removes legacy Tom title copy"

**Location:** `tests/seo.test.ts:11`

**Remnant:** This test name is purely descriptive of what the `metadataTitle` helper does - it strips old-format title fragments like "Tom" or "Tom Wild". The test and the helper are still relevant and correct. The word "legacy" is accurate context, not dead code.

**Impact:** None - the test is valid and covering real behaviour.

**Recommendation:** No action required.

**Effort:** N/A

---

## Storybook-Removal Dangling References

After a comprehensive grep across the entire working tree (excluding `node_modules/`, `dist/`, `.git/`) no dangling references to Storybook, `.stories.*`, `ComponentDesignPrimitiveStory`, `DetailPageStory`, `ScrollArrowsFixture`, or `story-helpers` remain in any source file, configuration file, documentation file, or test file.

| File                                                          | Reference                                                            | Status             |
| ------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------ |
| `.storybook/**` (34 files)                                    | All config + story files                                             | Deleted in 1e73fd0 |
| `src/frontend/thinkinglabs-ui/storybook/**` (4 files)         | Astro fixture components + styles                                    | Deleted in 1e73fd0 |
| `docs/agents/storybook.md`                                    | Storybook workflow doc                                               | Deleted in 1e73fd0 |
| `package.json` scripts                                        | `storybook`, `storybook:build`                                       | Deleted in 1e73fd0 |
| `package.json` devDependencies                                | `storybook`, `@storybook-astro/framework`, `@storybook/builder-vite` | Deleted in 1e73fd0 |
| `.gitignore`                                                  | `debug-storybook.log`, `storybook-server/`, `storybook-static/`      | Deleted in 1e73fd0 |
| `tsconfig.json` `include`                                     | `.storybook/**/*`                                                    | Deleted in 1e73fd0 |
| `package.json` `clean:local`                                  | `rimraf storybook-static storybook-server`                           | Deleted in 1e73fd0 |
| `AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md` | `pnpm storybook` / `pnpm storybook:build` commands                   | Deleted in 1e73fd0 |

**Stale Storybook references remaining: 0**

---

## TODO/FIXME/Commented-Code Inventory

| File         | Line | Marker | Content |
| ------------ | ---- | ------ | ------- |
| (none found) |      |        |         |

A comprehensive grep for `TODO`, `FIXME`, `HACK`, `XXX`, `@todo`, "remove me", "temporary" across all `src/**`, `scripts/**`, `tests/**`, `servers/**`, and `docs/**` files returned zero hits in production code. The word "temporary" appears only in legitimate contexts (`tempPath`, `mkdtemp`, `temp file` in editor utilities). No commented-out code blocks were found.

---

## Quick Wins (Ranked)

1. **Update `.harness/src/prompts/system.md` rendering section** - Fix the stale `StatusPill`/`Tags`/`MetaBlock` component list, update `vite.config.ts` to `vite.config.js`, then run `pnpm harness apply` to propagate to `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`. One edit, propagates to four files automatically. Fixes findings [High] + [Medium].

2. **Update `docs/conventions/components.md`** - Rewrite to describe the v2 component layer (removes the stale component list and the "Base layout's CSS" reference). Pure doc edit.

3. **Update `docs/agents/rendering-pipeline.md:5`** - Remove the stale four-component list from the one sentence. One-line edit.

4. **Update `.harness/src/settings/codex.toml`** - Fix stale path and Node version. One-line edit + `pnpm harness apply`.

5. **Add `.playwright-mcp/` to `.gitignore`** - One-line edit.

6. **Delete `src/components/EmptyState.astro`** - Dead file, zero callers. Safe after confirming no v2 page intends to use it.

---

## Larger Cleanups (Ranked)

1. **Reconcile `src/components/` purpose under v2.** The directory now holds four files with different roles: `EmbeddedTool.astro` (feature component, used by embed pages), `EmptyState.astro` (dead), `JsonLd.astro` and `PwaHead.astro` (infrastructure, used by `ThinkinglabsUiPage.astro`). Consider either migrating `JsonLd` and `PwaHead` into `src/layouts/` alongside `ThinkinglabsUiPage.astro`, or documenting this as the intentional "infrastructure utilities" layer. Without a written convention, new developers will not know whether to put new components here or in `src/frontend/thinkinglabs-ui/components/`.

2. **Clarify `icon-prototypes.astro` status.** The page sets `robots="noindex"` and imports from a `src/lib/icon-prototypes` helper that is only used by this page. If this is permanent (a design reference route), document it. If it is a transient design exploration from the v2 migration, delete it along with `src/lib/icon-prototypes.ts`.

---

## What Is Clean

- **Storybook removal was thorough.** Every import, script, dependency, gitignore entry, and tsconfig include for Storybook was removed. Zero dangling references remain in live code.
- **`temper` removal was complete.** No references to the "temper exploration page" survive anywhere in the codebase.
- **Source code has zero TODO/FIXME markers.** The codebase has no uncommitted annotation debt.
- **`vite.config.js` is Vite+-idiomatic.** Despite using the `.js` extension (not `.ts`), the file correctly uses `defineConfig` from `vite-plus` and the staged hooks are properly wired.
- **`.gitignore` covers all known generated artifacts.** Build outputs, proposal queue state, agent rejection files, Playwright outputs, and brain-diff feeds are all excluded.
- **Design-v2 migration structure is clean.** The `src/frontend/thinkinglabs-ui/` hierarchy is well-organized with `components/`, `pages/`, `mocks/`, `lib/`, and `types.ts`. No v1/legacy naming survives in the new component tree.
- **`tests/client-router-styles.test.ts`** actively guards against regression to the old Base layout - a useful migration safety net.
