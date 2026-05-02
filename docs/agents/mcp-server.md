# Personal MCP Server

`servers/thinkinglabs-mcp/` exposes the public personal repo as a stdio MCP server using `@modelcontextprotocol/sdk`.

Run locally with:

```sh
pnpm mcp:thinkinglabs -- --repo-root <path-to-repo>
```

The repo root can also be set via the `THINKINGLABS_MCP_REPO_ROOT` env var (validated through `src/lib/env.ts`); falls back to `process.cwd()`.

The store prefers `dist/index.sqlite` when it exists and falls back to validated markdown under `content/`.

## Public read-only resources

Fixed JSON views at:

- `thinkinglabs://thoughts`
- `thinkinglabs://claims`
- `thinkinglabs://claims/recent`
- `thinkinglabs://claims/by-tag/{tag}`
- `thinkinglabs://projects`
- `thinkinglabs://projects/active`
- `thinkinglabs://decisions`
- `thinkinglabs://decisions/recent`
- `thinkinglabs://predictions`
- `thinkinglabs://predictions/pending`
- `thinkinglabs://predictions/resolved`
- `thinkinglabs://predictions/calibration`
- `thinkinglabs://inputs`
- `thinkinglabs://inputs/recent`
- `thinkinglabs://questions`
- `thinkinglabs://provenance`
- `thinkinglabs://current_focus`
- `thinkinglabs://schema/version`

Per-object detail templates use `thinkinglabs://<kind>/{slug}` for `thoughts`, `claims`, `projects`, `decisions`, `predictions`, `inputs`, `questions`, `posts`, `changed-my-mind`, and `provenance`.

## Local-only tools (write/intake)

These tools are stdio-only and intended for local agent use:

- `query_view` — filters one public view by text, tags, and limit; includes the `provenance` view for accepted AI-assisted effects.
- `contact.precheck` — checks a proposed inquiry against `public/contact.json`.
- `contact.send` — validates a message and returns the public email handoff; it does not send mail.
- `question.submit` — writes a structured answer into `submissions/questions/<slug>/` for `triage-questions`.
- `subscribe_brain_diff` — returns public feed URLs and can include deterministic recent entries from git history.

## Model and provenance resources

Records of accepted AI-assisted effects and the active model configuration. Provenance is committed to the source tree but is intentionally not surfaced on the public web (see ADR-007); local agents reach it here.

- `thinkinglabs://provenance` — all provenance objects (one per accepted AI-assisted effect, recording `provider`, `model`, `tier`, source, target).
- `thinkinglabs://provenance/{slug}` — individual provenance object detail.
- `thinkinglabs://ai/current-models` — the env-resolved `ModelRef` per capability tier under the current configuration (mirrors `currentModelRefs()` from `src/lib/llm.ts`).
