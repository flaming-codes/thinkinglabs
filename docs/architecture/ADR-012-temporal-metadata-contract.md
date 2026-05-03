# ADR-012 — Temporal metadata contract (last_touched, last_reviewed, last_verified)

- **Status**: Accepted
- **Date**: 2026-05-01
- **Supersedes**: —
- **Superseded by**: —

## Context

Three different timestamps shape how the system reasons about content age, freshness, and revisit cadence: file-level `last_touched` (auto-derived from git history), object-level `last_reviewed` (declared in claim/prediction frontmatter), and section-level `last_verified` (declared in heading attributes per ADR-005). They're computed at different layers, surface in different consumers (renderer, index builder, MCP server, freshness/stale-claim agents), and must agree on a single truth model. Until now the rules were implicit, scattered across `src/lib/git.ts`, `src/index/builder.ts`, schema files, and the rehype freshness plugin. Subtle drift would silently mislead the freshness pills, the staleness agents, and any downstream feed consumer.

## Decision

**`last_touched` is git-derived, never hand-edited.** `lastTouchedSync(path, repoRoot)` runs `git log -1 --format=%cI -- <path>` and returns the committer-date in ISO-8601 with offset. When git is unavailable (shallow clones missing the file's first commit, untracked working-copy files, brand-new files staged but not committed, or test fixtures executing outside a repo) the function falls back to `statSync(path).mtime.toISOString()`. The fallback is intentional — a freshly-created file with no commits should still appear in `last_touched DESC` ordering rather than disappearing.

**Renames preserve history.** `git log --follow` is _not_ used; the bare `git log` walks the file path as-is, so a renamed file's `last_touched` advances to the rename commit. This is correct: a rename is a meaningful touch. Consumers needing pre-rename history must walk it explicitly via `walkFileHistory`.

**Shallow clones are a known limitation.** The brain-diff feed pipeline depends on full git history for accurate change feeds. Shallow checkouts will see truncated `last_touched` values, falling back to mtime where the commit is unreachable. This is acceptable for casual local rendering, but `pnpm artifacts` / `pnpm artifacts:scored` should be run from a full clone when feed accuracy matters.

**`last_reviewed` is a claim-level frontmatter field, hand-edited or written by the `review-stale-claims` agent's accepted proposals.** It expresses "when did the human last reaffirm this claim?", not "when did the file change?". Schemas enforce ISO-date format via `isoDate` (`src/schemas/_base.ts`). The freshness/stale-claim agents threshold on `now - last_reviewed`, never on `last_touched`.

**`last_verified` is a section-level heading attribute parsed by the remark plugin** (ADR-005). It lives in markdown body, not frontmatter, and is editorial — it expresses "when did the author re-read this paragraph and reaffirm it?". The rehype plugin renders the freshness pill from this value alone; it never falls back to `last_touched` or file mtime. Sections without `last_verified` get no pill.

**`FRESHNESS_NOW_ISO` is the deterministic clock for tests and local builds** (`src/lib/freshness.ts`, `src/lib/clock.ts`). When unset, the system uses real `Date.now()`. Build pipelines that snapshot HTML for diffing (none currently, but anticipated) should set this to a stable ISO string so freshness pills don't drift between rebuilds of identical source.

## Consequences

The three timestamps are orthogonal and serve distinct purposes; mixing them is a bug. Renderers and agents must pick the right one for the question they're asking:

- _"How recent is this file in the git tree?"_ → `last_touched`
- _"When did the human last vouch for this claim?"_ → `last_reviewed`
- _"When did the author last re-read this paragraph?"_ → `last_verified`

Adding a new temporal field requires explicit naming, an ADR amendment or successor, and a clear answer to the question above. Reusing `last_touched` for editorial intent is forbidden — the field is mechanical and the renderer treats it as ground truth.

## Caveats

- A bulk frontmatter rewrite (e.g., format-on-save) bumps `last_touched` for every file even though no semantic content changed. Mitigation: use `git commit --no-verify` sparingly; large reformats should land in one commit so downstream feeds collapse the noise via the brain-diff classifier.
- Force-pushed branches rewrite git history, which can move `last_touched` backwards. The brain-diff agent's `--since` flag should be advanced past any force-push boundary.
- `last_verified` and `last_reviewed` are author-asserted; the system makes no attempt to detect lies. The freshness pill colour is editorial transparency, not proof.
