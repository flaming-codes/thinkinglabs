---
title: Thinking Labs
status: alive
started: 2026-04-30
current_question: "Can a personal knowledge site become a trustworthy operating surface for both humans and agents without giving up plain-text authorship?"
help_welcome: "Useful pressure here is architectural and editorial: schema edges that feel wrong, agent workflows that need clearer confirmation, MCP views that should exist, and places where the public surface stops explaining the underlying system."
links:
  repo: https://github.com/flaming-codes/thinkinglabs
related_thoughts: []
related_claims: []
tags: [knowledge, agents, astro, markdown, mcp, sqlite, validation]
---

Thinking Labs is a markdown-canonical personal knowledge and agentic-space site. The durable state is not a CMS, hosted database, or generated index. It is the `content/` tree: one markdown file per thought, claim, project, prediction, decision, question, post, input, or provenance event, with YAML frontmatter validated by kind-specific Zod schemas.

Everything else is a projection of that source tree. Astro renders the public site and JSON routes from typed content collections. Offline builders derive `public/llms.txt`, JSON feeds, brain-diff feeds, and `dist/index.sqlite`, the local agent query layer. The MCP server reads the same corpus through a shared server factory, with both stdio and Streamable HTTP transports exposing fixed resources and tools for agents.

The repo is also an experiment in useful background agency with a strong confirmation boundary. Scanners such as `dormant-flip`, `review-decisions`, `resolve-predictions`, `freshness-review`, and `triage-questions` enqueue deterministic proposals into a local queue. They do not mutate content directly; accepted changes flow back through `pnpm review-proposals`, where a human can accept, edit, reject, or defer.

That makes the project less a static website than a small operating system for thinking in public. Schemas, ADRs, validation commands, and build artifacts are the guardrails. Markdown remains the thing that matters, but the surrounding surfaces let humans, browsers, feeds, and agents ask sharper questions of the same underlying material.
