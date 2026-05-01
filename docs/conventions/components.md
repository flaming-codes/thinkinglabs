# Shared rendering components

The four primitives in `src/components/` cover almost every per-kind rendering need; reach for them before introducing kind-specific markup.

- **`StatusPill.astro`** — a single-prop badge for any status enum value (`alive`/`dormant`/`shipped`/`abandoned`, `standing`/`reversed`/`superseded`, `open`/`partial`/`closed`). Color is keyed off `data-status` in the Base layout's CSS; new status values style as a neutral pill until added.
- **`MetaBlock.astro`** — renders frontmatter as a `<dl>` from a `fields: ReadonlyArray<[label, key]>` mapping. Skips entries that are `undefined`, `null`, `""`, or empty arrays so callers can pass partially-populated data without conditionals.
- **`Tags.astro`** — renders nothing on an empty array; safe to drop in unconditionally next to a heading or row.
- **`EmptyState.astro`** — italicized muted message; default is `"no items yet"`. Use this — not inline `<p>`s — so the empty rendering stays uniform across listings.

Components must stay thin and kind-agnostic. Per-kind logic (e.g., grouping projects by status, splitting predictions into pending vs resolved) lives in the page file or a `src/lib/<kind>.ts` helper, never in the component.

## Propose-then-curate UX primitives

Any new "agent proposes, human confirms" workflow (M5 background agents, future automation) builds on three shared primitives: `runReview` (`src/lib/review-cli.ts`) for the keystroke loop, `editInEditor` (`src/lib/editor.ts`) for editor-mediated mutations, and `patchFrontmatter` (extracted in Slice C) for writing frontmatter fields back to a content file. New scripts register their own action vocabularies against `runReview`; they do not reimplement the loop, raw-mode guard, or test-injection seam. See ADR-008 for the rationale.

Unattended agents (M5) write proposals to the queue documented in ADR-009; the same review-cli primitives drain the queue interactively.
