# ADR-002 — Markdown plus frontmatter as universal source format
- **Status**: Accepted
- **Date**: 2026-04-30
- **Supersedes**: —
- **Superseded by**: —

## Context
The system holds heterogeneous object kinds — long-form prose thoughts, atomic claims, project state, predictions, decisions, questions, evergreen posts, external inputs. Each has different required fields. Two failure modes loom: a single shared format too loose to validate (everything is a markdown file with arbitrary YAML), or per-kind formats so divergent that tooling has to special-case every kind (per-kind parsers, per-kind renderers, per-kind storage). Both kill the source-of-truth-first principle in different ways.

## Decision
Every object is one markdown file with a YAML frontmatter block. The frontmatter is validated against a per-kind Zod schema in `src/schemas/`; the body is free markdown. The schema registry (`src/schemas/index.ts` exporting `KIND_SCHEMAS`) is the single source of truth — Astro Content Collections, the index builder, the future MCP server, and the curation CLI all read schemas from this registry. Schemas drive both runtime validation and TypeScript types via `z.infer`. A malformed file fails `astro build` and the index builder with a clear path-and-issue error. Edge metadata (which frontmatter fields are typed link arrays) lives next to each schema and is consumed generically; no per-kind index code exists.

## Consequences
Adding a new kind is a localized change: one schema file plus a single registry entry; everything downstream (Astro collection wiring, content/<kind>/ glob, index ingestion, edge extraction) picks it up automatically. Authoring stays cheap — the file is human-readable in `$EDITOR`. Validation pressure is concentrated at the source boundary; internal code receives `z.infer` types and skips defensive checks. Cost: frontmatter is YAML, which has its own footguns (unquoted booleans, type coercion). We mitigate by keeping schemas strict and rejecting unknowns where it matters.

## Alternatives considered
TOML frontmatter was rejected for tooling friction; YAML is universal. JSON-only objects were rejected because the body of a thought is genuinely prose, and embedding markdown inside JSON is ergonomically hostile. Per-kind file extensions (`.thought.md`, `.claim.md`) were rejected as visual noise — directory placement carries the kind unambiguously. Storing schemas as `.yaml` files (the original plan) was rejected in favor of `.ts` so types and runtime validation share one source.
