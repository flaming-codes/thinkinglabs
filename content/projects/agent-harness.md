---
title: Agent Harness
status: alive
started: 2026-02-06
current_question: "Can one editable source-of-truth for agent configuration make Codex, Claude Code, GitHub Copilot, and Cursor feel like provider targets rather than separate project setup chores?"
help_welcome: "Useful pressure here is operational: migration edge cases, provider parity gaps, registry workflows that feel too magical, and places where generated files make ownership less clear instead of more clear."
links:
  repo: https://github.com/madebywild/agent-harness
related_thoughts: [agent-harness-is-the-new-ide]
related_claims: []
tags: [agents, open-source, wild, typescript, cli, mcp, codex, claude, copilot, cursor]
---

Agent Harness is an open-source Made by Wild monorepo for managing AI agent configuration from one canonical `.harness/` directory. It treats prompts, skills, MCP server configs, subagents, commands, settings, lifecycle hooks, presets, and registries as source-controlled entities, then renders the provider-native outputs expected by Codex, Claude Code, GitHub Copilot, and Cursor.

The core package, `@madebywild/agent-harness-framework`, is both a TypeScript library and the `harness` CLI. It handles workspace initialization, provider enablement, planning, validation, apply, watch mode, schema migration, registry pulls, third-party skill imports, and U-Haul migration from existing provider files such as `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, and Copilot instructions. The model is deliberately close to shadcn: shared agent assets are copied into the project as editable source, not hidden behind opaque package imports.

The supporting packages keep the boundaries explicit. `@madebywild/agent-harness-manifest` owns the Zod schemas and TypeScript types for manifests, lock files, overrides, registries, and generated indexes. `@madebywild/agent-harness-tui` provides the Ink and React terminal UI used when `harness` runs interactively, so the same engine can serve both direct commands and a guided setup flow.

The repo is less about a single CLI command than about a source-of-truth contract. Canonical files live under `.harness/src/**`; generated artifacts land where each provider expects them: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, provider skill folders, MCP config files, subagent definitions, hook files, and Codex TOML state. Planning detects drift, collisions, unmanaged outputs, stale generated files, and schema mismatches before apply writes anything.

What makes the project interesting to me is that it turns agent setup into infrastructure rather than folklore. As agents become the working surface for software development, the project-specific harness starts to matter as much as the editor configuration did. Agent Harness is the attempt to make that layer inspectable, portable, provider-aware, and owned by the repository.
