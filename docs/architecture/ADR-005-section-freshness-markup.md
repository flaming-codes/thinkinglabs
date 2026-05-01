# ADR-005 — In-body section-freshness markup

- **Status**: Accepted
- **Date**: 2026-04-30
- **Supersedes**: —
- **Superseded by**: —

## Context

Long-form evergreen posts (`content/posts/*.md`) age unevenly: a post about model pricing may have a "context budget" section that stays fresh for a year and a "model lineup" section that is stale within weeks. Stamping the whole document with a single `last_verified` field would force the lowest-common-denominator and discourage authoring posts at all. Per-section staleness needs a place in the source markdown that survives a `git clone` of the repo and renders to plain HTML without any client-side JS. The freshness review agent in M5 will read these stamps; whatever syntax the renderer accepts becomes the contract that agent has to honor.

## Decision

Headings in `content/posts/` carry Pandoc-style attribute blocks: `## Heading {#id key="value"}`. The protocol uses `id` for the anchor and `last_verified="YYYY-MM-DD"` for the freshness date; the parser is generic over `key="value"` so future stamps (`last_reviewed`, `confidence`, etc.) need only a rehype consumer, no syntax change. Two pure plugins implement it: `src/markdown/remark-section-freshness.ts` lifts the brace block into mdast `hProperties` and strips the original text; `src/markdown/rehype-section-freshness.ts` appends a `<span class="freshness-pill" data-state="green|amber|red">` next to any heading carrying `data-last-verified`. Day-bucket thresholds (< 30 green, 30–90 amber, > 90 red) live in `src/lib/freshness.ts` so the rehype plugin and any future consumer share one implementation. The plugin reads "now" from `FRESHNESS_NOW_ISO` if set, otherwise `new Date()`, so tests and brain-diff CI runs are deterministic. Rendering produces only HTML — no JavaScript, no client-side hydration.

## Consequences

A reader sees the freshness pill inline on every stamped heading, color-coded by age, with no JS dependency. The rendering pipeline picks up new attributes for free as long as a rehype consumer wants them. `getCollection("posts")` continues to return the parsed frontmatter; the in-body protocol does not pollute frontmatter. Cost: the markdown plugins run on every collection's markdown, not only `posts/`. Both plugins are no-ops on content that lacks the `{...}` block or the `data-last-verified` property, so the cost is one regex check per heading and one property lookup per heading. Tests at `tests/freshness.test.ts` and `tests/remark-section-freshness.test.ts` lock in the syntax, idempotence, and threshold math.

## Alternatives considered

A frontmatter `sections: [{id, last_verified}, ...]` array was rejected because it forces authors to maintain a parallel structure that drifts from heading text. A custom directive syntax (`:::verified 2026-04-15`) was rejected because Pandoc-style heading attributes are already the de-facto markdown extension for this and require no new tokens. A client-side rendering pass was rejected on no-JS grounds. Stamping per-document instead of per-section was rejected for the original reason: posts age unevenly section by section.
