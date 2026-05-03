# ADR-001 — Source vs index split

- **Status**: Accepted
- **Date**: 2026-04-30
- **Supersedes**: —
- **Superseded by**: —

## Context

The system serves two very different consumers from one body of personal knowledge: humans reading rendered pages and agents issuing structured queries (full-text search, link traversals, future semantic search). A single backing store would force a compromise — git diffs over a binary database are unreadable, a Cypher dump loses per-object file structure, and a hosted database adds an external dependency that the source-of-truth principle explicitly rules out. Authoring also has to remain plain-text editable in `$EDITOR` and reviewable in a pull request without running any tooling.

## Decision

Two-tier storage with a strict directionality. The `content/` tree of markdown files in git is canonical and sacred — all primary state lives here, one file per object, line-diffable. Every other artifact, including `dist/index.sqlite` produced by `scripts/build-index.ts`, is derived, gitignored, and rebuilt deterministically by local verification and artifact commands. No code path mutates the index without going through a source-tree edit first. Renderers (Astro site, future MCP server, JSON exports) treat both source and index as read-only and never write back.

## Consequences

The repo stays auditable: every change to knowledge state is a markdown commit. Builds are reproducible — same `content/` bytes produce the same `dist/index.sqlite` bytes, asserted by a vitest determinism test. Adding a new query pattern does not require a schema migration on user data, only a rebuild. Cost: every consumer pays a build step before issuing structured queries; this is acceptable at personal-knowledge scale (hundreds to low thousands of objects). A bug in the index builder cannot corrupt source — worst case is a stale index until the next build.

## Alternatives considered

A headless CMS as source was rejected because it inverts the source-of-truth and removes git as the audit log. A graph database (Neo4j, Kùzu) as source was rejected because its on-disk format produces opaque diffs and version-coupled corruption risk. A single sqlite file as source was rejected because it loses per-object file structure that makes `grep`, `$EDITOR`, and PR review work. ADR-003 covers the choice of sqlite specifically as the default index format.
