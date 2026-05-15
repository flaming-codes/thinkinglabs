import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CollectionEntry } from "astro:content";
import { describe, expect, it } from "vite-plus/test";
import { detailHref, listingHref } from "../src/lib/entity-routes.ts";
import {
  mapAboutKinds,
  mapCalibrationData,
  mapChangedMyMindView,
  mapClaimSummaries,
  mapDecisionsView,
  mapHomeKinds,
  mapInputsView,
  mapNowData,
  mapObservationDetail,
  mapObservationsView,
  mapPostSummaries,
  mapPredictionsView,
  mapProjectsView,
  mapQuestionsView,
  mapThoughtSummaries,
} from "../src/lib/thinkinglabs-ui.ts";
import { KIND_REGISTRY, LISTING_KINDS } from "../src/lib/registry.ts";
import type { Kind } from "../src/schemas/index.ts";

function mockEntry<K extends Kind>(
  id: string,
  data: Record<string, unknown>,
  body = "Body text for route consistency.",
): CollectionEntry<K> {
  return { id, data, body } as unknown as CollectionEntry<K>;
}

describe("thinkinglabs entity routes", () => {
  it("has a generated detail page pattern for every public listing kind", () => {
    for (const kind of LISTING_KINDS) {
      const route = listingHref(kind);
      expect(route).toBe(KIND_REGISTRY[kind].route);
      expect(detailHref(kind, "sample-slug")).toBe(`${route}/sample-slug`);
      expect(existsSync(join(process.cwd(), "src/pages", route.slice(1), "[...slug].astro"))).toBe(
        true,
      );
    }
  });

  it("maps entity listing rows to their registered detail hrefs", () => {
    const claim = mockEntry<"claims">("claim-one", {
      claim: "Claim one.",
      confidence: 0.6,
      last_reviewed: "2026-01-01",
      status: "active",
      evidence: [],
      opposing: [],
      tags: [],
      derived_from: [],
    });
    const thought = mockEntry<"thoughts">("thought-one", {
      title: "Thought one",
      created: "2026-01-01",
      updated: "2026-01-02",
      tags: [],
      claims: [],
      inputs: [],
    });
    const post = mockEntry<"posts">("post-one", {
      title: "Post one",
      created: "2026-01-01",
      updated: "2026-01-02",
      tags: [],
      related_claims: [],
      related_thoughts: [],
    });
    const project = mockEntry<"projects">("project-one", {
      title: "Project one",
      status: "alive",
      started: "2026-01-01",
      last_touched: "2026-01-02",
      current_question: "What next?",
      help_welcome: "Pointers",
      tags: [],
    });
    const prediction = mockEntry<"predictions">("prediction-one", {
      prediction: "Prediction one.",
      made: "2026-01-01",
      resolves: "2026-12-31",
      confidence: 0.7,
      resolution: "pending",
      resolved_on: null,
      tags: [],
    });
    const flip = mockEntry<"changed-my-mind">("flip-one", {
      title: "Flip one",
      date: "2026-01-01",
      superseded_claims: [],
      what_changed: "New evidence",
      tags: [],
    });
    const decision = mockEntry<"decisions">("decision-one", {
      decision: "Decision one.",
      date: "2026-01-01",
      status: "standing",
      context: "Context",
      why: "Why",
      follow_up_on: null,
      reverses: [],
      tags: [],
    });
    const question = mockEntry<"questions">("question-one", {
      question: "Question one?",
      asked: "2026-01-01",
      status: "open",
      context: "Context",
      ideal_responder: "Expert",
      attempts: [],
      related_claims: [],
      related_projects: [],
      tags: [],
    });
    const input = mockEntry<"inputs">("input-one", {
      title: "Input one",
      source: "Source",
      consumed: "2026-01-01",
      note: "Note",
      tags: [],
    });
    const observation = mockEntry<"observations">("observation-one", {
      observation: "Observation one.",
      observed: "2026-01-01",
      source: "Tom",
      context: "Context",
      related_claims: [],
      related_thoughts: [],
      related_projects: [],
      tags: [],
    });

    expect(mapHomeKinds({ posts: 1 }).find((kind) => kind.slug === "posts")?.href).toBe(
      listingHref("posts"),
    );
    expect(mapAboutKinds({ claims: 1 }).find((kind) => kind.slug === "claims")?.href).toBe(
      listingHref("claims"),
    );
    expect(mapClaimSummaries([claim])[0]?.href).toBe(detailHref("claims", claim.id));
    expect(mapThoughtSummaries([thought])[0]?.href).toBe(detailHref("thoughts", thought.id));
    expect(mapPostSummaries([post])[0]?.href).toBe(detailHref("posts", post.id));
    expect(
      mapNowData({ projects: [project], inputs: [], now: new Date("2026-01-03") }).active[0]?.href,
    ).toBe(detailHref("projects", project.id));
    expect(mapProjectsView({ entries: [project] }).rows[0]?.href).toBe(
      detailHref("projects", project.id),
    );
    expect(mapCalibrationData([prediction]).recent[0]?.href).toBe(
      detailHref("predictions", prediction.id),
    );
    expect(
      mapPredictionsView({ entries: [prediction], now: new Date("2026-01-03") }).open[0]?.href,
    ).toBe(detailHref("predictions", prediction.id));
    expect(mapChangedMyMindView({ entries: [flip], claims: [] }).flips[0]?.href).toBe(
      detailHref("changed-my-mind", flip.id),
    );
    expect(mapDecisionsView([decision]).active[0]?.href).toBe(detailHref("decisions", decision.id));
    expect(
      mapQuestionsView({ entries: [question], now: new Date("2026-01-03") }).questions[0]?.href,
    ).toBe(detailHref("questions", question.id));
    expect(mapInputsView({ entries: [input] }).inputs[0]?.href).toBe(
      detailHref("inputs", input.id),
    );
    expect(mapObservationsView({ entries: [observation] }).observations[0]?.href).toBe(
      detailHref("observations", observation.id),
    );
    expect(mapObservationDetail({ entry: observation }).slug).toBe(observation.id);
  });
});
