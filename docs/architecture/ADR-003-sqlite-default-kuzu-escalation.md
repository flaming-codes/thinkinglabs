# ADR-003 — sqlite as default index, Kùzu only on demonstrated pain

- **Status**: Accepted
- **Date**: 2026-04-30
- **Supersedes**: —
- **Superseded by**: —

## Context

The derived index (ADR-001) needs to support: per-kind listing, full-text search over body and key frontmatter, tag filtering, typed link traversals (recursive, e.g. "all claims derived from any thought tagged journalism"), and eventually semantic search via stored embeddings. A graph database with native Cypher (Kùzu, Neo4j) is tempting because some traversals read naturally as graph patterns. But the corpus is bounded by personal output — hundreds of thoughts, low thousands of claims, dozens of projects, ever — and the operational cost of an extra runtime is real.

## Decision

sqlite (`better-sqlite3`) is the default index format. The schema (`objects`, `links`, `tags`, `objects_fts` via FTS5, `embeddings` as a placeholder column) covers every M1 query. Recursive CTEs handle variable-depth traversals; FTS5 handles search; a future `sqlite-vec` extension will handle vectors without changing the file. The index file is `dist/index.sqlite`, gitignored, rebuilt deterministically. We commit to sqlite until a specific query pattern proves materially painful in SQL — typically multi-hop pattern matching with constraints that recursive CTEs express awkwardly. At that point, swap `dist/index.sqlite` for `dist/index.kuzu`, rebuilt from the same source tree by an alternate index builder. The escalation is reactive, not preemptive.

## Consequences

Day-one we ship one binary dependency (better-sqlite3) and one file format every contributor already understands. Queries are inspectable with the standard `sqlite3` CLI. Cost: deep graph patterns are awkward in SQL; if we hit that wall, we pay the migration. The migration cost is bounded — the source tree is unchanged, only the index builder swaps. We accept that risk over the certain operational cost of running Kùzu from day one.

## Alternatives considered

Kùzu from day one was rejected: an extra runtime, less mature tooling than sqlite, and we have no concrete query that needs Cypher today. DuckDB was considered for analytics but adds no graph affordance and overlaps sqlite for our query shape. In-memory only (no on-disk index, walk markdown on every query) was rejected because the future MCP server expects sub-millisecond reads and rebuilding state per request defeats the index entirely.
