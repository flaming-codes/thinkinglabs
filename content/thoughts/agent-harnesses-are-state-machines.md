---
title: "Agent harnesses are state machines"
created: 2026-05-21
updated: 2026-05-21
tags:
  - agents
  - harnesses
  - state-machines
  - workflows
claims: []
inputs: []
observations:
  - observations/frontier-models-follow-complex-instructions
---

I increasingly see a properly configured agent harness as a state machine.

The states do not have to be encoded as a formal graph. They can live in prompts, skills, lifecycle hooks, quality gates, and tool permissions. But the shape is the same: the agent begins in one condition, inspects the world, decides which transition is legal, performs the next action, validates the result, and either advances, retries, escalates, or stops.

I noticed this most clearly while setting up a harness for an internal prototypes repository, where the agent is responsible for effectively doing all the work around the prototype, not merely writing code inside an already-prepared environment. It checks whether the environment exists. It makes sure the user has GitHub available and is logged in. It creates and configures the app correctly. It runs the relevant setup, commits the result, pushes the branch, and leaves the team with something that can actually be inspected or continued.

That sounds like convenience until you ask Codex to draw the state flow. Then the hidden machine becomes visible. The diagram was longer and more complex than I expected: a real workflow with preflight checks, branches, retries, missing-prerequisite paths, validation gates, and handoff points. What I had experienced as "the agent just handles the setup" was, underneath, a fairly elaborate operating procedure.

The important part is that this procedure was not trapped inside some brittle orchestration service. It was expressed in the harness. The repository carried its own working protocol: what the agent should assume, what it must verify, which tools it may use, when it should stop, and what counts as done. The harness turned a messy human setup ritual into a reusable machine.

This is why harness quality matters so much. A weak harness gives the model a vague destination and hopes capability fills in the path. A strong harness defines the path as a sequence of recoverable states. The frontier model still supplies judgment, language, code, and local adaptation, but it is not wandering through an empty field. It is moving through a designed workflow.

As of this writing, models like GPT-5.5 and Claude Opus 4.7 are good enough at detailed instruction following that these natural-language state machines can be surprisingly deep. Skills make this even more interesting, because they let the top-level harness stay readable while moving domain-specific procedure into nested, task-specific instruction sets. The result is not just a smarter agent. It is an agent whose operational behavior can be shaped, versioned, reviewed, and improved like infrastructure.

The team benefit is immediate. People can spin up prototypes without caring about most of the setup, and without every contributor having to rediscover the local ceremony. The harness becomes the place where the ceremony is captured once, made explicit, and handed to the agent.
