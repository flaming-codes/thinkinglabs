---
title: CRAN/E
status: shipped
started: 2022-08-27
current_question: "How far can CRAN/E move from a faster CRAN search interface toward an intelligence layer for R packages, authors, trends, and agents?"
help_welcome: "R users can help most by pointing out missing discovery workflows: package comparison, author lookup, search relevance, trend interpretation, and MCP queries that should exist."
links:
  repo: https://github.com/flaming-codes/crane-app
related_thoughts: []
related_claims: []
tags: [r, search, pwa, react-router, supabase, mcp, analytics]
---

CRAN/E is "The Comprehensive R Archive Network, Enhanced": a modern search and discovery surface for R packages and authors hosted on CRAN. It is not a package host. It is an interface layer over the archive, built because finding the right package should not require fighting the shape of the old CRAN website.

The public app lives at [cran-e.com](https://cran-e.com) and is designed as a progressive web app. The current codebase is a TypeScript and React 19 application on React Router 7 with Vite, Tailwind CSS, Supabase, Arcjet, OpenTelemetry, Vitest, Playwright, Storybook, the Vercel AI SDK, Google Gemini, and embedding-backed search. It also has a Raycast extension ecosystem nearby, because package search belongs where developers are already moving.

The core user experience is search, but the project has grown into a broader map of the R package ecosystem. Package pages pull together dependencies, relations, maintainers, authors, downloads, binaries, documentation, teams, insights, structured metadata, and FAQ data. Statistics pages track page trends, package downloads, package trends, and R releases, with some summary work delegated to Gemini.

CRAN/E also exposes a read-only MCP server at `/api/mcp`. That matters because package discovery is no longer only a browser workflow. Agents should be able to ask the same structured questions that a person asks: find a package, inspect an author, search broadly, or look for related packages through stable `cran://` resources.

The project is shipped and maintained, with versioned releases and dependency/security work still happening. The next version of the question is less "can CRAN be searched better?" and more "what does an agent-readable software ecosystem index make possible for working R programmers?"
