# Documentation & System-Prompt Review - Thinking Labs (2026-06-04)

**Reviewer:** Documentation · **Branch:** feat-design-v2 @ 1e73fd0

---

## Executive Summary

The system-prompt layer is cleanly managed: `CLAUDE.md`, `AGENTS.md`, and `.github/copilot-instructions.md` are byte-for-byte identical and match `.harness/src/prompts/system.md` exactly, confirming Harness-driven generation with no hand-edits. The ADR corpus (ADR-001 through ADR-013) is largely accurate and provides genuine architectural value. The main documentation risk on this branch is a **component-location drift** introduced by the `feat-design-v2` design refactor: CLAUDE.md, `docs/conventions/components.md`, and `docs/agents/rendering-pipeline.md` all claim that `StatusPill`, `Tags`, and `MetaBlock` live in `src/components/`, but those files do not exist; the reusable UI layer has moved to `src/frontend/thinkinglabs-ui/components/`. Additionally, the `observations` kind is present in code and the schema registry but is absent from both CLAUDE.md and README.md. Several ADRs carry residual "future MCP server" phrasing that is now misleading but not hazardous. The org style rule (avoid em dashes) is violated in 21 engineering-doc files.

**Overall docs health: 6/10** -- accurate at the architectural level, with two significant accuracy gaps that could mislead agents or new contributors.

---

## Scope & Method

Read-only static review. Files inspected:

- System-prompt sources: `.harness/src/prompts/system.md`, all four override YAMLs, `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`
- README.md
- `docs/architecture/ADR-001` through `ADR-013` (all 13 files)
- `docs/agents/` (all 6 files)
- `docs/conventions/components.md`
- `docs/reviews/system-review-2026-05-02.md`
- Key code paths: `src/schemas/kinds.ts`, `src/schemas/index.ts`, `src/components/`, `src/frontend/thinkinglabs-ui/components/`, `src/lib/registry.ts`, `src/lib/agent-registry.ts`, `servers/thinkinglabs-mcp/server.ts`, `package.json` scripts, `scripts/launchd/`.

Cross-checked via `grep`, `ls`, and `find` for structural accuracy. No builds were run.

---

## System-Prompt Sync Analysis

| File                              | Bytes  | Match to `system.md`? | Source or generated? |
| --------------------------------- | ------ | --------------------- | -------------------- |
| `.harness/src/prompts/system.md`  | 13,152 | Canonical             | Source               |
| `CLAUDE.md`                       | 13,152 | Byte-identical        | Harness-generated    |
| `AGENTS.md`                       | 13,152 | Byte-identical        | Harness-generated    |
| `.github/copilot-instructions.md` | 13,152 | Byte-identical        | Harness-generated    |

**All four files are byte-identical. This is intentional**: the Harness produces a single system prompt and fans it out to all provider outputs. No per-provider overrides are active (all four `system.overrides.*.yaml` files contain only `version: 1`). The "Harness source of truth" rule is being honored -- no generated file has been hand-edited.

The identical-content strategy means every provider receives the same context, which is deliberate for this repo's single-owner model.

---

## Accuracy / Drift Findings

| Doc + Location                                                                                             | Claim                                                                                                                             | Reality in Code                                                                                                                                                                                                                    | Verdict                                       |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `CLAUDE.md` line 88; `docs/conventions/components.md` line 3-8; `docs/agents/rendering-pipeline.md` line 5 | `StatusPill`, `Tags`, `MetaBlock` live in `src/components/`                                                                       | None of these three files exist anywhere in the repo; `src/components/` contains only `EmptyState.astro`, `EmbeddedTool.astro`, `JsonLd.astro`, `PwaHead.astro`; the new UI layer is in `src/frontend/thinkinglabs-ui/components/` | **Wrong** (design-v2 refactor)                |
| `CLAUDE.md` line 60                                                                                        | "Adding a new kind = new schema + `KIND_SCHEMAS` entry + collection + listing/detail pages + API endpoint"                        | Code also requires a `KIND_REGISTRY` entry in `src/lib/registry.ts` (routes, title/date fields, MCP views) -- the README.md correctly lists this as a third contract                                                               | **Incomplete**                                |
| `CLAUDE.md` line 52 and entire body                                                                        | `observations` kind not mentioned anywhere                                                                                        | `observations` is fully implemented: `src/schemas/observation.ts`, `src/schemas/index.ts`, `src/lib/registry.ts`, `src/pages/api/observations.json.ts`, listing/detail pages, MCP view                                             | **Omission**                                  |
| `docs/architecture/ADR-001` line 14; `ADR-002` line 14; `ADR-004` line 14                                  | "future MCP server"                                                                                                               | MCP server has been live since M6 (ADR-010, ADR-013); ADR-003 has a current-state note acknowledging this for its own body but ADR-001, ADR-002, and ADR-004 still use the phrase uncorrected in their Decision text               | **Stale phrasing** (low harm)                 |
| `CLAUDE.md` line 88                                                                                        | "See `docs/conventions/components.md`" for component conventions                                                                  | That doc exists and is correct for the two remaining `src/components/` primitives (`EmptyState`, `EmbeddedTool`) but still describes four components, three of which no longer exist                                               | **Partially wrong**                           |
| `docs/agents/rendering-pipeline.md` line 3 (add-a-kind recipe)                                             | "A new object kind is added by writing a Zod schema + `KIND_SCHEMAS` entry + `content.config.ts` + listing/detail + API endpoint" | Omits required `KIND_REGISTRY` entry in `src/lib/registry.ts`                                                                                                                                                                      | **Incomplete**                                |
| `docs/architecture/ADR-008` line 10                                                                        | "Future M5 background agents will use it too"                                                                                     | M5 agents shipped; that phrase is in the original Decision body but not in a current-state note                                                                                                                                    | **Stale** (low harm)                          |
| `docs/architecture/ADR-005` line 10                                                                        | "The freshness review agent in M5 will read these stamps"                                                                         | M5 shipped                                                                                                                                                                                                                         | **Stale** (low harm)                          |
| `CLAUDE.md` line 46 / `docs/agents/proposal-pipeline.md`                                                   | Does not mention `src/lib/agent-registry.ts` / `AGENT_REGISTRY`                                                                   | `AGENT_REGISTRY` now exists in `src/lib/agent-registry.ts` as a structured registry of all five agents (implementing a recommendation from the 2026-05-02 review)                                                                  | **Omission** (minor)                          |
| `docs/reviews/system-review-2026-05-02.md` P2 item "Replace Unsafe Agent Content Walking"                  | `src/lib/walk-content.ts` was flagged as the unsafe walker                                                                        | `walk-content.ts` no longer exists; `content-repo.ts` now exists at `src/lib/content-repo.ts`                                                                                                                                      | **Resolved** (no update needed in old review) |
| `docs/reviews/system-review-2026-05-02.md` P2 "Introduce An Agent/Proposal Registry"                       | Suggested adding `AGENT_REGISTRY`                                                                                                 | `src/lib/agent-registry.ts` now exists with `AGENT_REGISTRY`                                                                                                                                                                       | **Resolved**                                  |
| `docs/reviews/system-review-2026-05-02.md` P1 "Add Browser/E2E Coverage"                                   | No Playwright found                                                                                                               | `tests/e2e/` now has 6 spec files                                                                                                                                                                                                  | **Resolved**                                  |

---

## Findings

### [Critical] Component location claim is wrong on feat-design-v2

**Location:** `CLAUDE.md` line 88; `docs/conventions/components.md` lines 3-8; `docs/agents/rendering-pipeline.md` line 5

**Observation:** All three documents state that the four shared primitives -- `StatusPill`, `Tags`, `MetaBlock`, `EmptyState` -- live in `src/components/`. On this branch, `StatusPill.astro`, `Tags.astro`, and `MetaBlock.astro` do not exist anywhere in the repository. `src/components/` now contains only `EmptyState.astro`, `EmbeddedTool.astro`, `JsonLd.astro`, and `PwaHead.astro`. The design-v2 refactor moved the reusable UI layer into `src/frontend/thinkinglabs-ui/components/` (which contains `StatusTag.astro`, `ConfidenceMeter.astro`, `MetricTile.astro`, `SiteHeader.astro`, and ~30 other components).

**Impact:** An agent or new contributor following the documentation would look in `src/components/` for components that do not exist there, potentially creating duplicates or applying the wrong architectural guidance. The claim that four primitives exist is factually wrong for three of them.

**Recommendation:** Update all three documents to reflect the new layout. Decide which shared primitives are the canonical set (likely `EmptyState` and `EmbeddedTool` in `src/components/`, plus the design-layer components in `src/frontend/thinkinglabs-ui/components/`), then document both tiers accurately.

**Effort:** S

---

### [High] `observations` kind undocumented in system prompt and README

**Location:** `CLAUDE.md` (entire file); `README.md` lines 71-83

**Observation:** The `observations` kind is fully implemented: it has a Zod schema (`src/schemas/observation.ts`), a `KIND_SCHEMAS` entry, a `KIND_REGISTRY` entry, a JSON API endpoint (`src/pages/api/observations.json.ts`), and an MCP view (`thinkinglabs://observations`). Yet neither CLAUDE.md nor README.md lists `observations` among the public kinds. README.md's kind list (lines 71-82) covers 9 kinds but omits `observations`.

**Impact:** Agents operating from CLAUDE.md receive an incomplete picture of the content model. The kind list in CLAUDE.md has no kind list at all (it discusses architecture abstractly) -- this is more a README gap. An agent adding content might not create observations files because the kind isn't mentioned.

**Recommendation:** Add `observations` to the kind inventory in README.md (alongside its short description). Consider also noting it in the CLAUDE.md architecture section when listing the kinds.

**Effort:** S

---

### [High] Add-a-kind recipe is incomplete in CLAUDE.md and rendering-pipeline.md

**Location:** `CLAUDE.md` line 60; `docs/agents/rendering-pipeline.md` line 3

**Observation:** Both documents describe adding a new kind as requiring: schema file + `KIND_SCHEMAS` entry + `src/content.config.ts` collection + listing/detail pages + API endpoint. Neither mentions the required `KIND_REGISTRY` entry in `src/lib/registry.ts`, which governs routes, title/date fields, API exposure, MCP view registration, and nav inclusion. The README.md correctly documents this as a three-contract requirement at lines 64-69. An agent following CLAUDE.md would produce a kind that has no routes, no nav entry, and no MCP resource.

**Impact:** A missing `KIND_REGISTRY` entry means the new kind's listing page URL would need to be hardcoded, the MCP server would not expose the view, and `llms.txt` would omit it. The compile-time assertion in `src/schemas/index.ts` catches missing `KIND_SCHEMAS` coverage but there is no equivalent assertion for `KIND_REGISTRY`.

**Recommendation:** Add "entry in `src/lib/registry.ts` (`KIND_REGISTRY`)" as a required step in both the CLAUDE.md schema section and the rendering-pipeline.md add-a-kind recipe.

**Effort:** S

---

### [Medium] "future MCP server" phrasing in ADR-001, ADR-002, ADR-004 Decision sections

**Location:** `docs/architecture/ADR-001-source-vs-index.md` line 14; `docs/architecture/ADR-002-markdown-frontmatter.md` line 14; `docs/architecture/ADR-004-renderer-pipeline.md` line 14

**Observation:** The original Decision sections of ADR-001, ADR-002, and ADR-004 each refer to the "future MCP server." The MCP server has been live since ADR-010 was written (2026-05-01). ADR-003 added a current-state note that explicitly resolves this phrase, but ADR-001, ADR-002, and ADR-004 have no equivalent annotation.

**Impact:** Low operational impact since the ADRs capture historical decisions, but a reader unfamiliar with the chronology might believe the MCP server is still planned rather than shipped.

**Recommendation:** Add a brief current-state note to each of these three ADRs (matching the ADR-003 pattern) noting that "future MCP server" now refers to `pnpm mcp:thinkinglabs` / `pnpm mcp:thinkinglabs:http`; see ADR-010/ADR-013. A single line per ADR is sufficient.

**Effort:** S

---

### [Medium] Residual milestone / Slice nomenclature in shipped ADRs and conventions docs

**Location:** `docs/architecture/ADR-007` line 18 ("Slice C"); `docs/architecture/ADR-008` lines 10, 18 ("Future M5 background agents"); `docs/architecture/ADR-005` line 10 ("in M5"); `docs/conventions/components.md` lines 18, 20 ("M5 background agents, future automation"; "Unattended agents (M5)"); `docs/agents/derivation-pipeline.md` lines 5, 7 ("Slice C"; "M5 agents")

**Observation:** Several documents use internal milestone labels (M5, M6, M7, Slice C) as if they are current context, when all referenced milestones have shipped. "Future M5 background agents" and "Slice C extraction" are implementation-era labels. The 2026-05-02 review flagged this (P3 action item) but the ADR original bodies remain unedited. ADR-007 and ADR-008 have current-state notes that resolve their own most important claims, but the problematic phrases remain in the original Decision text.

**Impact:** Confuses new contributors who don't have the milestone history. Slightly undermines the credibility of the docs as a current reference.

**Recommendation:** Do not rewrite ADR Decision sections (they are historical records). Instead, expand the existing "Current state" notes with a single sentence: "M5 / Slice C work items noted above are shipped; see ADR-009 for the complete agent inventory." Update `docs/conventions/components.md` to replace "M5 background agents, future automation" with "Background agents (see ADR-009)."

**Effort:** S

---

### [Medium] CLAUDE.md does not mention `src/frontend/thinkinglabs-ui/` at all

**Location:** `CLAUDE.md` (entire file)

**Observation:** The `feat-design-v2` branch introduced a substantial UI layer under `src/frontend/thinkinglabs-ui/` with components, page compositions, and mocks. README.md documents this layer at lines 13, 148-154. CLAUDE.md (the agent-facing system prompt) has no mention of this directory, the `DetailPage.astro`/`EntityDetail.astro` split documented in `docs/conventions/components.md`, or the conventions around `src/frontend/thinkinglabs-ui/pages/` vs `src/pages/`.

**Impact:** An agent tasked with building a new page or component has no instruction about where new UI compositions should live, potentially placing them in `src/pages/` directly rather than following the composition pattern.

**Recommendation:** Add a brief "Frontend" subsection to the CLAUDE.md Rendering section that mirrors the README.md lines 148-154, pointing to the composition layer and the `src/frontend/thinkinglabs-ui/` structure.

**Effort:** S

---

### [Medium] `docs/conventions/components.md` describes three non-existent components

**Location:** `docs/conventions/components.md` lines 5-8

**Observation:** `StatusPill.astro`, `MetaBlock.astro`, and `Tags.astro` are documented as primitives in `src/components/` but do not exist. Only `EmptyState.astro` from the original four still exists at that path. The document correctly describes `EmptyState` behavior. The new UI component that approximates `StatusPill` is `StatusTag.astro` in `src/frontend/thinkinglabs-ui/components/`.

**Impact:** Agents reading this document to understand the component library receive a description of three non-existent files.

**Recommendation:** Update the document to reflect current reality: describe the components that actually exist at `src/components/` (`EmptyState`, `EmbeddedTool`), and add a section for the design-layer components in `src/frontend/thinkinglabs-ui/components/` with the correct names.

**Effort:** S

---

### [Low] `AGENT_REGISTRY` in `src/lib/agent-registry.ts` is not documented

**Location:** `CLAUDE.md` proposal-agent section (line 68-74); `docs/agents/proposal-pipeline.md`

**Observation:** `src/lib/agent-registry.ts` now exports `AGENT_REGISTRY`, implementing the P2 recommendation from the 2026-05-02 review. Neither the system prompt nor the proposal-pipeline doc mentions it. The pipeline doc still describes the add-a-new-agent recipe as requiring manual TypeScript union edits, which may now be managed through the registry.

**Impact:** Low -- the code works regardless. But documentation-driven agents adding a new background agent would not know to update `AGENT_REGISTRY`.

**Recommendation:** Add one sentence to the proposal-pipeline.md add-a-new-agent recipe: "Update `AGENT_REGISTRY` in `src/lib/agent-registry.ts` with the new agent's spec."

**Effort:** S

---

### [Low] Em dashes throughout engineering docs (org style rule violation)

**Location:** 21 files in `docs/`, including all 13 ADRs, all 6 agent how-to docs, `docs/conventions/components.md`, and two existing 2026-06-04 review files

**Observation:** The organization instruction "Avoid em dashes" applies to all writing. All engineering docs use em dashes (U+2014) extensively -- in ADR titles, status fields ("Supersedes: --"), inline prose, and table cells. CLAUDE.md, AGENTS.md, and `copilot-instructions.md` contain no em dashes. The ADR title format "ADR-001 -- Source vs index split" uses em dashes.

**Impact:** Violates the stated org style rule. The ADR corpus uses em dashes structurally in the "Supersedes/Superseded by" header fields and in title separators, so remediation requires a consistent replacement (e.g., " - " for prose, "none" or "n/a" for blank header fields).

**Recommendation:** Do a bulk find-and-replace pass on the docs tree. For blank `Supersedes`/`Superseded by` fields, replace "---" with "none". For ADR title separators, use " - ". For inline em dashes in prose, replace with " - " or restructure the sentence. This is mechanical work.

**Effort:** M (21 files, mostly search-and-replace)

---

### [Low] README.md "Deeper docs" list omits ADR-003 through ADR-006, ADR-008, ADR-011, ADR-012

**Location:** `README.md` lines 172-182

**Observation:** The "Deeper docs" section links only to ADR-001, ADR-002, ADR-007, ADR-009, ADR-010, ADR-013. ADR-003 (SQLite index choice), ADR-004 (renderer pipeline), ADR-005 (section freshness markup), ADR-006 (brain-diff), ADR-008 (review CLI), ADR-011 (embedded agents), and ADR-012 (temporal metadata) are not linked.

**Impact:** Low for a reader who checks `docs/architecture/` directly. May leave casual readers unaware of the freshness-markup convention or the temporal-metadata contract.

**Recommendation:** Either add the missing ADRs to the list or replace the partial list with a simple note to browse `docs/architecture/` for all ADRs.

**Effort:** S

---

### [Info] 2026-05-02 review action items: status update

For completeness, here is the current resolution status of the priority items raised in `docs/reviews/system-review-2026-05-02.md`:

| Item                                    | Status                                                                                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1 Centralize kind/surface metadata     | Partially addressed: `KIND_REGISTRY` in `src/lib/registry.ts` now exists. `MCP_PUBLIC_VIEWS` derives from registry. Full unification of `SURFACES` + MCP inventory is ongoing. |
| P1 Replace unsafe agent content walking | Resolved: `src/lib/walk-content.ts` removed; `src/lib/content-repo.ts` exists.                                                                                                 |
| P1 Reuse prediction calibration logic   | Not verified by this reviewer (out of scope for doc review; flagged in mcp-servers review).                                                                                    |
| P1 Add browser/E2E coverage             | Resolved: `tests/e2e/` has 6 spec files.                                                                                                                                       |
| P1 Fix stale LLM provider docs          | Resolved: `.env.example` now has a historical note about `ANTHROPIC_API_KEY`; the active docs reference `OPENAI_API_KEY`.                                                      |
| P2 Introduce agent/proposal registry    | Resolved: `src/lib/agent-registry.ts` with `AGENT_REGISTRY` now exists.                                                                                                        |
| P2 Refresh README / MCP docs            | Partially addressed: README no longer has the private plans pointer; MCP docs are current. Launchd doc updated with `__LOG_DIR__` guidance.                                    |
| P3 Clarify ADR milestone language       | Not yet addressed (still present).                                                                                                                                             |

---

## Quick Wins (ranked)

1. **Add `observations` to README.md kind list** -- one line, zero ambiguity risk removed.
2. **Add `KIND_REGISTRY` to the add-a-kind recipe in CLAUDE.md line 60 and rendering-pipeline.md line 3** -- prevents a silent registry gap when an agent adds a kind.
3. **Update CLAUDE.md Rendering section to note that `StatusPill`/`Tags`/`MetaBlock` have moved** -- stops agents from looking in the wrong place.
4. **Add a current-state note to ADR-001, ADR-002, ADR-004** resolving "future MCP server" -- 1 sentence each.
5. **Add `AGENT_REGISTRY` update to proposal-pipeline.md add-a-agent recipe** -- one sentence.

## Larger Doc Work (ranked)

1. **Update `docs/conventions/components.md`** to reflect the two-tier component model (thin `src/components/` primitives + design-layer `src/frontend/thinkinglabs-ui/components/`). Medium effort -- requires understanding the boundary between the two layers.
2. **Add a Frontend section to CLAUDE.md** covering `src/frontend/thinkinglabs-ui/` structure and the `DetailPage`/`EntityDetail` split. Medium effort -- needs coordination with the in-progress design refactor so it doesn't drift again immediately.
3. **Em-dash remediation across 21 docs files**. Mechanical but broad.
4. **Update ADR milestone language** (M5/Slice C) with current-state notes. Low priority given the existing current-state notes in most ADRs.

---

## What's Already Good (keep)

- **Harness-managed system-prompt sync** is working correctly. All four provider outputs are byte-identical and match the canonical source. The override files are clean (only `version: 1`).
- **ADR coverage and depth** -- 13 ADRs with decision rationale, consequences, alternatives, and current-state annotations. The current-state update pattern (added to ADR-007, ADR-008, ADR-009, ADR-010, ADR-011, ADR-013) is excellent practice and should be continued.
- **README.md** is the clearest and most up-to-date engineering doc. The source model diagram, the 3-contract add-a-kind recipe, and the mermaid architecture diagram are all accurate.
- **`docs/agents/` how-to docs** are accurate and action-oriented. The proposal-pipeline.md, brain-diff-pipeline.md, and derivation-pipeline.md are reliable guides for the patterns they describe.
- **`docs/reviews/` pattern** -- the 2026-05-02 review served as a meaningful tracking document; action items have been resolved at a high rate.
- **2026-05-02 review items resolved** -- walk-content removal, e2e test addition, and AGENT_REGISTRY creation all address previous findings.

---

## Open Questions for the Maintainer

1. **Is the `feat-design-v2` branch design stable enough to update the system prompt now?** The component location inconsistency in CLAUDE.md is a branch-specific issue -- if `feat-design-v2` is about to merge, updating the system prompt (via `.harness/src/prompts/system.md` + `pnpm harness apply`) before merge avoids carrying stale docs into `main`.

2. **What is the intended architecture for `src/components/` vs `src/frontend/thinkinglabs-ui/components/`?** Is `src/components/` now exclusively for non-UI infrastructure (`EmptyState`, `EmbeddedTool`, `JsonLd`, `PwaHead`)? Or will some components move back? The answer determines how `docs/conventions/components.md` should be rewritten.

3. **Should the `observations` kind have been in the README kind list already, or is it intentionally unlisted?** If unlisted by design (perhaps it's an internal kind), the README should say so.

4. **Is there a deployment for `mcp.thinkinglabs.run`?** ADR-013 and `docs/agents/mcp-http-server.md` reference this URL. The system prompt and README do not surface it to agents, which may be intentional if the server isn't live yet.

5. **Is the em-dash rule intended to apply retroactively to existing docs, or only to new writing?** The answer determines whether the 21-file remediation is worth doing or only new docs need to comply.
