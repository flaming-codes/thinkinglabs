import type { CollectionEntry } from "astro:content";
import { describe, expect, it } from "vite-plus/test";
import {
  buildTitleLookup,
  inputCitationBacklinks,
  inputCitationCounts,
  mapPredictionDetail,
  predictionEvidenceBacklinks,
} from "../src/lib/thinkinglabs-ui.ts";

type RelationshipCollection = "thoughts" | "inputs" | "observations" | "predictions" | "claims";

function entry<K extends RelationshipCollection>(
  collection: K,
  id: string,
  data: CollectionEntry<K>["data"],
  body = "",
): CollectionEntry<K> {
  return { collection, id, data, body } as CollectionEntry<K>;
}

describe("thinkinglabs UI relationship mappers", () => {
  const thought = entry("thoughts", "agent-harnesses-will-move-onto-the-shelf", {
    title: "Agent harnesses will move onto the shelf",
    created: "2026-05-14",
    updated: "2026-05-14",
    tags: ["agents"],
    claims: [],
    inputs: ["openai-workspace-agents-chatgpt"],
    observations: [],
  });

  const input = entry("inputs", "openai-workspace-agents-chatgpt", {
    title: "Introducing workspace agents in ChatGPT",
    url: "https://openai.com/index/introducing-workspace-agents-in-chatgpt/",
    source: "OpenAI",
    consumed: "2026-05-14",
    note: "Workspace agents signal agent directories.",
    tags: ["agents"],
  });

  const observation = entry("observations", "agent-work-is-supervisory", {
    observation: "Agent work is becoming supervisory.",
    observed: "2026-05-14",
    source: "Tom",
    context: "Observed while working with agent apps.",
    related_claims: [],
    related_thoughts: [],
    related_projects: [],
    tags: ["agents"],
  });

  const prediction = entry("predictions", "agent-marketplaces-succeed-app-stores", {
    prediction: "Agent marketplaces will succeed app stores.",
    made: "2026-05-14",
    resolves: "2027-05-14",
    confidence: 0.57,
    resolution: "pending",
    resolved_on: null,
    resolution_note: null,
    evidence_at_time: [
      "agent-harnesses-will-move-onto-the-shelf",
      "inputs/openai-workspace-agents-chatgpt",
      "agent-work-is-supervisory",
    ],
    tags: ["agents"],
  });

  const claim = entry("claims", "agent-marketplaces-need-sources", {
    claim: "Agent marketplaces need explicit source trails.",
    confidence: 0.68,
    evidence: [],
    opposing: [],
    derived_from: ["inputs/openai-workspace-agents-chatgpt"],
    last_reviewed: "2026-05-13",
    status: "active",
    supersedes: [],
    superseded_by: [],
    tags: ["agents"],
  });

  it("resolves prediction evidence labels for thoughts, inputs, and observations", () => {
    const lookups = buildTitleLookup({
      thoughts: [thought],
      inputs: [input],
      observations: [observation],
    });

    const detail = mapPredictionDetail({ entry: prediction, lookups, now: new Date("2026-05-15") });

    expect(detail.evidence).toEqual([
      {
        label: "Agent harnesses will move onto the shelf",
        href: "/thoughts/agent-harnesses-will-move-onto-the-shelf",
      },
      {
        label: "Introducing workspace agents in ChatGPT",
        href: "/inputs/openai-workspace-agents-chatgpt",
      },
      {
        label: "Agent work is becoming supervisory.",
        href: "/observations/agent-work-is-supervisory",
      },
    ]);
  });

  it("derives reverse prediction backlinks for prefixed refs and bare thought refs", () => {
    const expectedDate = ["2026", "05", "14"].join("-");

    expect(
      predictionEvidenceBacklinks({
        predictions: [prediction],
        targetKind: "thoughts",
        targetSlug: "agent-harnesses-will-move-onto-the-shelf",
      }),
    ).toEqual([
      {
        kind: "prediction",
        title: "Agent marketplaces will succeed app stores.",
        href: "/predictions/agent-marketplaces-succeed-app-stores",
        conf: 0.57,
        date: expectedDate,
      },
    ]);

    expect(
      predictionEvidenceBacklinks({
        predictions: [prediction],
        targetKind: "inputs",
        targetSlug: "openai-workspace-agents-chatgpt",
      }),
    ).toHaveLength(1);

    expect(
      predictionEvidenceBacklinks({
        predictions: [prediction],
        targetKind: "observations",
        targetSlug: "agent-work-is-supervisory",
      }),
    ).toHaveLength(1);
  });

  it("derives input citation backlinks from every direct input link field", () => {
    expect(
      inputCitationBacklinks({
        targetSlug: input.id,
        thoughts: [thought],
        claims: [claim],
        predictions: [prediction],
      }),
    ).toEqual([
      {
        kind: "prediction",
        title: "Agent marketplaces will succeed app stores.",
        href: "/predictions/agent-marketplaces-succeed-app-stores",
        conf: 0.57,
        date: "2026-05-14",
      },
      {
        kind: "thought",
        title: "Agent harnesses will move onto the shelf",
        href: "/thoughts/agent-harnesses-will-move-onto-the-shelf",
        date: "2026-05-14",
      },
      {
        kind: "claim",
        title: "Agent marketplaces need explicit source trails.",
        href: "/claims/agent-marketplaces-need-sources",
        conf: 0.68,
        date: "2026-05-13",
      },
    ]);
  });

  it("counts input citations for listing influence", () => {
    expect(
      inputCitationCounts({
        inputs: [input],
        thoughts: [thought],
        claims: [claim],
        predictions: [prediction],
      }).get(input.id),
    ).toBe(3);
  });
});
