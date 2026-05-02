# Personal MCP Server

`servers/thinkinglabs-mcp/` exposes the public personal repo as a stdio MCP server using `@modelcontextprotocol/sdk`.

Run locally with:

```sh
pnpm mcp:thinkinglabs -- --repo-root /Users/tom/Github/thinkinglabs
```

Resources are fixed JSON views at `thinkinglabs://thoughts`, `thinkinglabs://claims`, `thinkinglabs://projects`, `thinkinglabs://decisions`, `thinkinglabs://predictions`, `thinkinglabs://inputs`, `thinkinglabs://inputs/recent`, `thinkinglabs://questions`, `thinkinglabs://current_focus`, `thinkinglabs://claims/recent`, `thinkinglabs://claims/by-tag/{tag}`, `thinkinglabs://projects/active`, `thinkinglabs://decisions/recent`, `thinkinglabs://predictions/pending`, `thinkinglabs://predictions/resolved`, `thinkinglabs://predictions/calibration`, and `thinkinglabs://schema/version`. Per-object templates use `thinkinglabs://<kind>/{slug}` for thoughts, claims, projects, decisions, predictions, inputs, and questions. The store prefers `dist/index.sqlite` when it exists and falls back to validated markdown under `content/`.

Tools:

- `query_view` filters one public view by text, tags, and limit, including the `provenance` view for accepted AI-assisted effects.
- `contact.precheck` checks a proposed inquiry against `public/contact.json`.
- `contact.send` validates a message and returns the public email handoff; it does not send mail.
- `question.submit` writes a structured answer into `submissions/questions/<slug>/` for `triage-questions`.
- `subscribe_brain_diff` returns public feed URLs and can include deterministic recent entries from git history.
