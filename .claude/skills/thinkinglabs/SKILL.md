---
name: thinkinglabs
description: Use when reading, querying, or integrating with the public thinkinglabs corpus through Markdown, JSON, feeds, or MCP.
---

# Thinkinglabs

Thinkinglabs is a public markdown-canonical thinking surface. Use this skill when an agent needs to discover content, query public objects, inspect source-backed pages, or submit an answer to an open question.

## What I Can Accomplish

- Discover public pages, detail routes, JSON APIs, feeds, and MCP endpoints from `/llms.txt`.
- Read clean page-shaped Markdown by appending `.md` to canonical public URLs.
- Query public collections through `/api/<kind>.json` or the `query_view` MCP tool.
- Traverse public resources through the remote MCP endpoint at `https://mcp.thinkinglabs.run/mcp`.
- Precheck contact intent with `contact.precheck` before preparing a human email handoff.
- Submit structured answers to public questions with the `question.submit` MCP tool.

## Required Inputs

- A target task, topic, tag, object slug, or public view name.
- For MCP use, a client that supports Streamable HTTP MCP.
- For question submissions, the question slug and a substantive answer body.

## Constraints

- The canonical source is `content/<kind>/*.md`; generated artifacts are projections.
- Public JSON APIs and Markdown variants are read-only.
- The MCP server is public-only; provenance and private local state are not exposed.
- `contact.send` prepares a handoff and does not send mail.
- Token counts are approximate and use the `chars/4` estimate exposed as `agent_metadata.approx_token_count`.
- Prefer `/llms.txt`, `.md` variants, JSON APIs, feeds, or MCP over crawling rendered HTML.

## Key Documentation

- [`/llms.txt`](/llms.txt): Agent-readable public surface index.
- [`/agents`](/agents): MCP resources, tools, JSON APIs, feeds, and connection examples.
- [`/agent-permissions.json`](/agent-permissions.json): Automated-access policy and preferred entrypoints.
- [`AGENTS.md`](https://github.com/flaming-codes/thinkinglabs/blob/main/AGENTS.md): Repository operating instructions.
- [`docs/agents/mcp-http-server.md`](https://github.com/flaming-codes/thinkinglabs/blob/main/docs/agents/mcp-http-server.md): Remote MCP transport contract.
