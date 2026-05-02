# me

Personal agentic space — a public operating surface for my work. The git repo is canonical: every object (thought, claim, project, prediction, decision, question, post, input) lives as one markdown file with Zod-validated frontmatter under `content/`. The Astro site, the derived `dist/index.sqlite` query layer, and the personal MCP server are pure projections of that source tree.

## Quickstart

```sh
pnpm install
pnpm dev               # Astro dev server for the site
pnpm verify            # local CI: clean, typecheck, check, build, structured-data:empty, build:fixtures, structured-data:fixtures, build:index, test
pnpm test:e2e          # Playwright against the fixture preview (requires `playwright install`)
pnpm verify:full       # verify + e2e in one shot
pnpm build:index       # rebuild dist/index.sqlite (the agent-facing query layer)
pnpm mcp:thinkinglabs  # run the personal MCP server over stdio
```

`pnpm verify` is what CI runs; it validates every frontmatter file via the Astro build, builds the sqlite index, and runs the test suite. Day-to-day, `pnpm dev` for the site and `pnpm build:index` to refresh the query index after content edits.

## What ships today

- **The Astro site** under `src/pages/` (rendered from `getCollection(kind)` plus the surface inventory in `src/lib/surfaces.ts`).
- **A personal MCP server** at `servers/thinkinglabs-mcp/` exposing fixed JSON resources and tools over stdio. Run it with `pnpm mcp:thinkinglabs`. Resource taxonomy, tool list, and the `dist/index.sqlite` fallback path are documented in [`docs/agents/mcp-server.md`](./docs/agents/mcp-server.md).
- **Five background agents** (`dormant-flip`, `review-decisions`, `resolve-predictions`, `freshness-review`, `triage-questions`) that scan content and enqueue typed proposals; the human drains the queue with `pnpm review-proposals`. Architecture in [`docs/agents/proposal-pipeline.md`](./docs/agents/proposal-pipeline.md); launchd installation in [`scripts/launchd/README.md`](./scripts/launchd/README.md).

Architectural decisions are in [`docs/architecture/`](./docs/architecture/) (ADR-001 through ADR-012). Read the relevant ADR before changing a pipeline — they capture _why_, not just what.
