---
title: Fixture provenance event for resolved prediction
event_type: content_resolution
process_id: resolve-predictions
actor:
  kind: llm
  model:
    provider: openai
    model: gpt-fixture
    tier: balanced
started_at: 2026-04-01T10:00:00Z
accepted_at: 2026-04-01T10:01:00Z
source_objects:
  - id: predictions/seed-resolved
target_objects:
  - id: predictions/seed-resolved
outcome: accepted
tags: [fixture]
---

Fixture body — a provenance event so the provenance route, JSON API, and MCP resource get exercised by fixture builds.
