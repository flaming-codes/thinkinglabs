import type { CollectionEntry } from "astro:content";
import { describe, expect, it } from "vite-plus/test";
import {
  buildTitleLookup,
  inputCitationBacklinks,
  inputCitationCounts,
  mapClaimDetail,
  mapObservationDetail,
  mapPredictionDetail,
  predictionEvidenceBacklinks,
} from "../src/lib/thinkinglabs-ui.ts";
import { buildSections } from "../src/lib/thinkinglabs-ui/post-sections.ts";

type RelationshipCollection =
  | "thoughts"
  | "inputs"
  | "observations"
  | "predictions"
  | "claims"
  | "posts";

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

  const post = entry("posts", "agent-markets-and-source-trails", {
    title: "Agent markets and source trails",
    created: "2026-05-15",
    updated: "2026-05-15",
    summary: "Source trails matter for agent marketplaces.",
    related_claims: [],
    related_thoughts: [],
    inputs: ["inputs/openai-workspace-agents-chatgpt"],
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
        posts: [post],
      }),
    ).toEqual([
      {
        kind: "post",
        title: "Agent markets and source trails",
        href: "/posts/agent-markets-and-source-trails",
        date: "2026-05-15",
      },
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
        posts: [post],
      }).get(input.id),
    ).toBe(4);
  });

  it("extracts id, lastVerified, and freshnessState from pandoc section headings in buildSections", () => {
    const body = [
      '## Title {#my-id last_verified="2026-04-01"}',
      "",
      "Fresh section content.",
      "",
      '## Aging Section {#aging-id last_verified="2026-02-15"}',
      "",
      "Aging section content.",
      "",
      '## Stale Section {#stale-id last_verified="2025-11-01"}',
      "",
      "Stale section content.",
    ].join("\n");

    const sections = buildSections(body, "2026-04-10");

    expect(sections).toHaveLength(3);
    expect(sections[0]).toMatchObject({
      number: "01",
      title: "Title",
      id: "my-id",
      lastVerified: "2026-04-01",
      freshnessState: "fresh",
    });
    expect(sections[1]).toMatchObject({
      number: "02",
      title: "Aging Section",
      id: "aging-id",
      lastVerified: "2026-02-15",
      freshnessState: "aging",
    });
    expect(sections[2]).toMatchObject({
      number: "03",
      title: "Stale Section",
      id: "stale-id",
      lastVerified: "2025-11-01",
      freshnessState: "stale",
    });
  });

  it("resolves inputs/<slug> and observations/<slug> titles in mapClaimDetail via buildTitleLookup", () => {
    const multiSourceClaim = entry("claims", "multi-source-claim", {
      claim: "Claims can derive from thoughts, inputs, and observations.",
      confidence: 0.75,
      evidence: [],
      opposing: [],
      derived_from: [
        "agent-harnesses-will-move-onto-the-shelf",
        "inputs/openai-workspace-agents-chatgpt",
        "observations/agent-work-is-supervisory",
      ],
      last_reviewed: "2026-05-14",
      status: "active",
      supersedes: [],
      superseded_by: [],
      tags: ["agents"],
    });

    const lookups = buildTitleLookup({
      thoughts: [thought],
      inputs: [input],
      observations: [observation],
    });

    const detail = mapClaimDetail({
      entry: multiSourceClaim,
      history: [],
      lookups,
    });

    expect(detail.evidence).toEqual([
      {
        kind: "thought",
        title: "Agent harnesses will move onto the shelf",
        id: "thoughts/agent-harnesses-will-move-onto-the-shelf",
        href: "/thoughts/agent-harnesses-will-move-onto-the-shelf",
      },
      {
        kind: "input",
        title: "Introducing workspace agents in ChatGPT",
        id: "inputs/openai-workspace-agents-chatgpt",
        href: "/inputs/openai-workspace-agents-chatgpt",
      },
      {
        kind: "observation",
        title: "Agent work is becoming supervisory.",
        id: "observations/agent-work-is-supervisory",
        href: "/observations/agent-work-is-supervisory",
      },
    ]);
  });

  it("includes prediction evidence backlinks in mapObservationDetail when provided", () => {
    const predictionBacklinks = predictionEvidenceBacklinks({
      predictions: [prediction],
      targetKind: "observations",
      targetSlug: observation.id,
    });

    const detail = mapObservationDetail({
      entry: observation,
      predictionEvidence: predictionBacklinks,
    });

    expect(detail.predictionEvidence).toEqual([
      {
        kind: "prediction",
        title: "Agent marketplaces will succeed app stores.",
        href: "/predictions/agent-marketplaces-succeed-app-stores",
        conf: 0.57,
        date: "2026-05-14",
      },
    ]);
    expect(detail.referencedByPredictions).toEqual(detail.predictionEvidence);
  });
});
