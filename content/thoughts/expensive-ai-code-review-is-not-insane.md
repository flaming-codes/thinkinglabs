---
title: "Expensive AI code review is not insane"
created: 2026-05-16
updated: 2026-05-16
tags:
  - agents
  - code-review
  - pricing
  - software
claims: []
inputs:
  - anthropic-claude-code-review-pricing
  - openai-codex-pricing
---

Anthropic estimates Claude Code Review at roughly $15 to $25 per PR. At first glance, that sounds insane.

The comparison that makes it feel insane is Codex. OpenAI's Codex Pro tier starts at $100 per month, and for many day-to-day coding workflows the usage envelope can feel close to unlimited, especially next to a review product that might consume a meaningful fraction of that subscription on a single pull request. The instinctive reaction is: how can one review cost that much?

But I think the reason is simple. A real review by a senior engineer, the kind of review that is actually worth its salt, is not a glance at the diff. It is ten to thirty minutes of attention, sometimes more: reading the change, reconstructing intent, checking edge cases, asking whether the local fix violates a distant invariant, and deciding which comments are worth spending another human's time on. The expensive part is not generating text. The expensive part is sustained judgment over a live codebase.

Seen that way, $15 to $25 is not priced against tokens. It is priced against senior engineering attention. And against that benchmark, it is still cheaper than a human review, while being fully automated, non-blocking, and available in the background whenever the organization chooses to spend it.

That does not make it a casual developer feature. This is big-enterprise economics: high-trust automation attached to expensive teams, expensive codebases, and expensive mistakes. But it also means the price is less outlandish than it first appears. If the review is genuinely good, the surprising part is not that it costs real money. The surprising part is that we briefly expected serious code review to be priced like autocomplete.
