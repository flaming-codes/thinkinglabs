import type { CollectionEntry } from "astro:content";
import { describe, expect, it } from "vite-plus/test";
import {
  buildTitleLookup,
  mapPredictionDetail,
  predictionEvidenceBacklinks,
} from "../src/lib/thinkinglabs-ui.ts";

type RelationshipCollection = "thoughts" | "inputs" | "predictions";

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
    inputs: [],
  });

  const input = entry("inputs", "openai-workspace-agents-chatgpt", {
    title: "Introducing workspace agents in ChatGPT",
    url: "https://openai.com/index/introducing-workspace-agents-in-chatgpt/",
    source: "OpenAI",
    consumed: "2026-05-14",
    note: "Workspace agents signal agent directories.",
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
    ],
    tags: ["agents"],
  });

  it("resolves prediction evidence labels for thoughts and prefixed inputs", () => {
    const lookups = buildTitleLookup({ thoughts: [thought], inputs: [input] });

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
  });
});
