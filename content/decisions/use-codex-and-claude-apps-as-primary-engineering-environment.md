---
decision: "Use Codex and Claude macOS apps as my primary engineering environment"
date: 2026-05-14
status: standing
context: "My day-to-day software work has moved from an editor-centered workflow into agent desktop apps that hold the repo, shell, browser, instructions, and review loop."
options_considered:
  - "Keep VS Code as the primary engineering environment and use agent apps as assistants."
  - "Use Codex and Claude as the primary engineering environment, with VS Code reserved for direct file-oriented tasks."
  - "Split primary work evenly between VS Code, Codex, and Claude."
chosen: "Default to agent workbenches for engineering work, with Codex first when browser-backed inspection matters and VS Code reserved for precise file edits."
why: "Most engineering work now benefits more from an agentic workbench that can coordinate repository context, terminal commands, browser inspection, edits, and validation than from direct manipulation inside a traditional editor."
what_would_change_my_mind: "I would reconsider if agent desktop apps became less reliable for repository work, if their browser and shell loops stopped feeling integrated, or if VS Code regained a clear advantage for the majority of engineering tasks."
reverses: []
related_claims:
  - "claims/agent-harness-absorbs-complexity"
related_projects:
  - "projects/agent-harness"
tags:
  - agents
  - tools
  - development
---

Codex and Claude's macOS apps are now my primary engineering environment.

VS Code is still part of the loop, but mostly for direct file-related tasks: quick manual inspection, targeted edits, or work where I specifically want an editor surface. The center of gravity has shifted elsewhere.

For most engineering work, I now prefer to start in Codex or Claude. Codex is the default when the task benefits from the immersive browser view, because it makes implementation, local verification, and UI inspection feel like one continuous workspace rather than separate tools I have to manually coordinate. Claude remains useful as another high-quality agentic engineering surface, especially when I want a different model's judgment or interaction style.

The decision is less about brand loyalty than workflow shape. The thing I want to inhabit is no longer just a file tree plus terminal. It is the loop that moves from intent to context gathering, patch, test, browser inspection, correction, and handoff.
