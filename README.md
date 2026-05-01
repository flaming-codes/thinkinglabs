# me

Personal agentic space — a public operating surface for my work. The git repo is canonical: every object (thought, claim, project, prediction, decision, question, post, input) lives as one markdown file with Zod-validated frontmatter under `content/`. The Astro site, the derived `dist/index.sqlite` query layer, and (later) an MCP server are pure projections of that source tree.

To build locally: `pnpm install`, then `pnpm verify` runs typecheck, the Astro build (which validates every frontmatter file), the sqlite index build, and the test suite. Day-to-day, `pnpm dev` for the site and `pnpm build:index` to refresh the query index.

The full execution plan lives at `~/.claude/plans/brainstorm-more-realisitc-ideas-merry-rain.md`. Architectural decisions are in [`docs/architecture/`](./docs/architecture/).

To wire the five M5 background agents to run unattended on a schedule, see [`docs/agents/proposal-pipeline.md`](./docs/agents/proposal-pipeline.md) for how the proposal queue works and [`scripts/launchd/README.md`](./scripts/launchd/README.md) for launchd installation.
