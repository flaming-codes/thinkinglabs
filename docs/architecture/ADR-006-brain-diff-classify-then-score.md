# ADR-006 — Brain-diff is classify-first, score-second
- **Status**: Accepted
- **Date**: 2026-04-30
- **Supersedes**: —
- **Superseded by**: —

## Context
The brain-diff feed publishes meaningful changes across `thoughts/`, `claims/`, `decisions/`, `predictions/`, `projects/`, `posts/`. The naive design sends every commit to an LLM with the full diff and asks "is this substantive?", which couples every feed-build to LLM availability, inflates cost, and leaves the structural information (path, frontmatter shape) unused. Specialized feeds (`predictions-resolved`, `claims-revised`, `decisions-reversed`) need to work in CI environments without `ANTHROPIC_API_KEY` so contributors can validate the pipeline locally and rebuild the feed during outages.

## Decision
Two-pass design. **Pass 1 is deterministic classification**: `src/lib/brain-diff.ts` walks `git log` + `git show`, parses frontmatter once, and assigns each file change one of nine `EntryType` codes by pattern-match on path and frontmatter delta. No network. **Pass 2 is LLM scoring + summary**: `src/lib/brain-diff-score.ts` calls Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) once per file change with a structured tool-use response (`extract_substantiveness({ score, summary })`) validated against a Zod schema at the system edge. The scoring system prompt is reused across calls and marked `cache_control: ephemeral` so prompt-caching collapses repeated cost. Scores < 4 are excluded from the *generic* feed (`brain-diff.xml`/`brain-diff.json`); specialized feeds always include their type's matches regardless of score because the deterministic predicate already filtered for the category that matters. `--no-llm` mode (or absent `ANTHROPIC_API_KEY`) emits all classified entries with `score: null`/`summary: null` and skips the gate.

## Consequences
Specialized feeds are LLM-free and reproducible from git alone. The generic feed degrades gracefully: with a key it filters typo fixes; without one it emits everything classified. Adding a new `EntryType` is a single dispatch case in `classify()` plus an entry in `FEED_PREDICATES` if it warrants its own specialized feed. The Zod schema on the tool response means a malformed model output is detected at the boundary, not silently propagated as a feed entry. Cost: per-file LLM call rather than per-commit, which is more calls per push but each call is small and cached. `GENERIC_FEED_MIN_SCORE = 4` is exported so the threshold is configurable in one place; bumping it later changes feed selectivity without touching the scorer.

## Alternatives considered
A single-pass LLM-only filter was rejected because it makes the pipeline LLM-required and discards the structural signals that classify trivially. Per-commit scoring (rather than per-file) was rejected because a single commit can touch a typo in one file and a confidence revision in another; the file is the right unit. Self-hosting a smaller classifier was rejected as premature — Haiku 4.5 with prompt caching is cheap enough at this throughput that adding infrastructure isn't justified. Putting the score threshold in the CLI was rejected to keep the constant adjacent to the predicate logic.
