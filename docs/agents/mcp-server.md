# Personal MCP Server

`servers/me-mcp/` exposes the public personal repo as a stdio MCP server using `@modelcontextprotocol/sdk`.

Run locally with:

```sh
pnpm mcp:me -- --repo-root /Users/tom/Github/me
```

Resources are fixed JSON views at `me://thoughts`, `me://claims`, `me://projects`, `me://decisions`, `me://predictions`, `me://inputs`, and `me://current_focus`. The store prefers `dist/index.sqlite` when it exists and falls back to validated markdown under `content/`.

Tools:

- `query_view` filters one public view by text, tags, and limit.
- `contact.precheck` checks a proposed inquiry against `public/contact.json`.
- `contact.send` validates a message and returns the public email handoff; it does not send mail.
- `subscribe_brain_diff` returns public feed URLs and can include deterministic recent entries from git history.
