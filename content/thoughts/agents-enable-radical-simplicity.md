---
title: Agents enable radical simplicity
created: 2026-05-10T00:00:00.000Z
updated: 2026-05-10T00:00:00.000Z
tags:
  - agents
  - simplicity
  - prompts
  - skills
claims:
  - agent-harness-absorbs-complexity
  - decision-logic-as-natural-language
  - prompt-is-spec-is-implementation
  - radical-simplicity-fewer-parts-per-capability
  - agent-runtime-substitutes-for-platform
  - cost-shift-from-infra-to-writing-favorable
  - agent-systems-collapse-surface-area
inputs: []
---

Agents enable radical simplicity.

For an internal prototyping setup, I asked Codex to draw a flow diagram of an existing system already in use inside Wild. The diagram came back, and the thing that struck me was not the picture itself but what it revealed: the flows and decision trees inside that project are dense, branching, conditional. Real software-shaped complexity. None of it lives in a service mesh or an orchestration engine. It lives as prompts and skills inside that project's agent harness.

The harness absorbs the complexity that would otherwise need its own scaffolding. Decision logic that used to require a state machine, a config file, a small DSL, or a feature-flag service is now a few paragraphs of natural-language instruction sitting next to the code it acts on. The branching is real, but the surface area collapses. There is no extra system to deploy, monitor, version, or onboard people to. The prompt is the spec is the implementation.

This is what I mean by radical simplicity: not "fewer features," but fewer moving parts per unit of capability. The agent is the runtime that lets a small set of well-written instructions stand in for what used to demand a small platform. The cost moves from infrastructure to writing well, which is a trade I will take every time.
