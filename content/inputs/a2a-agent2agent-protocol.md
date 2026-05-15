---
title: "Agent2Agent (A2A) Protocol documentation"
url: "https://a2a-protocol.org/latest/"
source: "Linux Foundation / A2A Protocol Working Group"
consumed: 2026-05-15
note: "A2A is an open agent-to-agent interoperability protocol, originally developed by Google and donated to the Linux Foundation, with concepts for client agents acting on behalf of users, remote agent servers, agent cards, task lifecycles, modality negotiation, and secure opaque collaboration."
tags:
  - agents
  - protocols
  - orchestration
  - interoperability
---

A2A is evidence that agent-to-agent communication is hardening into an explicit product and infrastructure boundary. Its core model separates a client agent, which acts on behalf of a user, from remote agent servers that publish capabilities and take on tasks without exposing their internal tools, memory, or execution details.

This matters because it gives the imagined worker-agent layer a plausible protocol substrate. MCP makes tools and resources reachable by an agent; A2A makes other agents reachable as peers, specialists, or delegated workers.
