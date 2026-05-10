---
prediction: "By 2027-10-01, at least 50% of professional software developers in a credible public developer survey will report that an agent desktop app, agent workbench, or open source equivalent is their primary coding environment rather than a traditional IDE."
made: 2026-05-10
resolves: 2027-10-01
confidence: 0.65
resolution: pending
resolved_on: null
resolution_note: null
evidence_at_time:
  - thoughts/agent-harness-is-the-new-ide
tags:
  - agents
  - tools
  - development
---

The underlying bet is that Codex, Claude Code, and their open source equivalents are becoming the place where development work is coordinated, not merely tools invoked from inside an editor. For a meaningful minority of developers, the center of gravity will move from VS Code, JetBrains, Neovim, and similar IDEs to agent desktop apps or agent workbenches that hold the repository, shell, browser, tests, instructions, review loop, and task memory.

For resolution, "primary coding environment" should mean the environment where the developer spends the largest share of hands-on software work time, even if they still open a traditional editor for occasional direct edits. A "credible public developer survey" can include sources such as Stack Overflow, JetBrains, GitHub, State of JS, State of AI Engineering, or another broadly cited industry survey with a transparent sample and methodology. If no credible survey asks this question directly by the resolution date, resolve as ambiguous rather than false.

The prediction should resolve true if the threshold is met by desktop agent apps, terminal agent workbenches, local agent IDE replacements, or open source equivalents. It should resolve false if agent tools are widely used but remain mostly embedded inside traditional IDEs or terminals rather than replacing them as the working environment for at least 50% of surveyed professional developers.
