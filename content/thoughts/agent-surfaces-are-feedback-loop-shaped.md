---
title: "Agent surfaces are feedback-loop shaped"
created: 2026-05-14
updated: 2026-05-14
tags:
  - agents
  - development
  - workflows
claims: []
inputs: []
---

Agent surfaces are feedback-loop shaped.

Tagging Claude or Codex in a communication channel like Slack makes the most sense when the loop is almost embarrassingly short: I send a request, the agent replies with a confirmation, and the work either is done or is clearly queued somewhere else. The channel is useful because the interaction is lightweight, shared, and close to the place where the request naturally appears.

As soon as the work needs more than one or two turns of correction, the center of gravity moves. A desktop app or CLI is still the better interface for iterative agent work because it gives the loop somewhere to live: context, files, diffs, logs, tests, failures, retries, and all the small course corrections that make the work real. Local development with agents enables the most sophisticated feedback loops because the agent is sitting inside the same environment as the artifact it is changing.

Cloud agents sit between those poles. They are easier to manage across parallel work streams, which matters when several pieces can move independently, but they are slower and more distant because each stream has to spin up inside a virtual machine before it can become useful. That trade is often worth it for parallelism, but it is not the same thing as immediacy.

The right surface is not "chat versus IDE versus cloud." It is the shortest loop that can still hold the work.
