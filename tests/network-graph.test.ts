import { describe, expect, it } from "vite-plus/test";
import { buildNetworkGraph, type EntriesByKind } from "../src/lib/network-graph.ts";

/** Minimal entry shape that satisfies the structural contract `buildNetworkGraph` cares about. */
function entry<K extends string>(
  id: string,
  data: Record<string, unknown>,
): {
  id: string;
  data: Record<string, unknown>;
  collection: K;
} {
  return { id, data, collection: "" as K };
}

describe("buildNetworkGraph", () => {
  it("emits one node per entry across kinds and keeps `<kind>/<slug>` ids stable", () => {
    const entries = {
      thoughts: [
        entry("agent-harness-is-the-new-ide", {
          title: "The agent harness is the new IDE",
          claims: [],
          inputs: [],
        }),
      ],
      claims: [
        entry("agent-harness-absorbs-complexity", {
          claim: "Agent harnesses absorb complexity.",
          confidence: 0.85,
          derived_from: [],
          supersedes: [],
          superseded_by: [],
        }),
      ],
      projects: [
        entry("thinkinglabs", { title: "thinkinglabs", related_thoughts: [], related_claims: [] }),
      ],
    } as unknown as EntriesByKind;

    const { nodes, edges } = buildNetworkGraph(entries);

    expect(nodes.map((n) => n.id).sort()).toEqual([
      "claims/agent-harness-absorbs-complexity",
      "projects/thinkinglabs",
      "thoughts/agent-harness-is-the-new-ide",
    ]);
    expect(edges).toEqual([]);
    const thought = nodes.find((n) => n.id === "thoughts/agent-harness-is-the-new-ide")!;
    expect(thought.kind).toBe("thoughts");
    expect(thought.title).toBe("The agent harness is the new IDE");
    expect(thought.href).toBe("/thoughts/agent-harness-is-the-new-ide");
  });

  it("walks linkFields and emits a typed edge with the schema-defined label", () => {
    const entries = {
      thoughts: [
        entry("agents-enable-radical-simplicity", {
          title: "Agents enable radical simplicity",
          claims: ["agent-harness-absorbs-complexity"],
          inputs: [],
        }),
      ],
      claims: [
        entry("agent-harness-absorbs-complexity", {
          claim: "Agent harnesses absorb complexity.",
          confidence: 0.85,
          derived_from: ["thoughts/agents-enable-radical-simplicity"],
          supersedes: [],
          superseded_by: [],
        }),
      ],
    } as unknown as EntriesByKind;

    const { edges } = buildNetworkGraph(entries);

    // thoughts -> claims uses the `claims` linkField which maps to label `claims`.
    expect(edges).toContainEqual({
      from: "thoughts/agents-enable-radical-simplicity",
      to: "claims/agent-harness-absorbs-complexity",
      label: "claims",
    });
    // claims -> thoughts via `derived_from` uses the `derived_from` label.
    expect(edges).toContainEqual({
      from: "claims/agent-harness-absorbs-complexity",
      to: "thoughts/agents-enable-radical-simplicity",
      label: "derived_from",
    });
    expect(edges).toHaveLength(2);
  });

  it("resolves prefix-less refs against the field's fallback kind (claims via related_claims)", () => {
    const entries = {
      claims: [
        entry("c1", {
          claim: "c1",
          confidence: 0.5,
          derived_from: [],
          supersedes: [],
          superseded_by: [],
        }),
      ],
      projects: [
        entry("p1", {
          title: "p1",
          // bare slug, no kind prefix — should resolve to claims/c1
          related_claims: ["c1"],
          related_thoughts: [],
        }),
      ],
    } as unknown as EntriesByKind;

    const { edges } = buildNetworkGraph(entries);
    expect(edges).toEqual([{ from: "projects/p1", to: "claims/c1", label: "related_claims" }]);
  });

  it("emits prediction evidence edges to thoughts, inputs, and observations", () => {
    const entries = {
      thoughts: [entry("t1", { title: "t1", claims: [], inputs: [] })],
      inputs: [
        entry("i1", {
          title: "i1",
          consumed: "2026-01-01",
          tags: [],
        }),
      ],
      observations: [
        entry("o1", {
          observation: "o1",
          observed: "2026-01-02",
          related_claims: [],
          related_thoughts: [],
          related_projects: [],
          tags: [],
        }),
      ],
      predictions: [
        entry("p1", {
          prediction: "p1",
          made: "2026-01-01",
          resolves: "2027-01-01",
          confidence: 0.6,
          resolution: "pending",
          resolved_on: null,
          resolution_note: null,
          evidence_at_time: ["t1", "inputs/i1", "o1"],
          tags: [],
        }),
      ],
    } as unknown as EntriesByKind;

    const { edges } = buildNetworkGraph(entries);

    expect(edges).toContainEqual({
      from: "predictions/p1",
      to: "thoughts/t1",
      label: "evidence_at_time",
    });
    expect(edges).toContainEqual({
      from: "predictions/p1",
      to: "inputs/i1",
      label: "evidence_at_time",
    });
    expect(edges).toContainEqual({
      from: "predictions/p1",
      to: "observations/o1",
      label: "evidence_at_time",
    });
    expect(edges).toHaveLength(3);
  });

  it("computes degree as the sum of incoming + outgoing edges", () => {
    const entries = {
      thoughts: [entry("t1", { title: "t1", claims: ["c1", "c2"], inputs: [] })],
      claims: [
        entry("c1", {
          claim: "c1",
          confidence: 0.5,
          derived_from: [],
          supersedes: [],
          superseded_by: [],
        }),
        entry("c2", {
          claim: "c2",
          confidence: 0.5,
          derived_from: [],
          supersedes: [],
          superseded_by: [],
        }),
      ],
    } as unknown as EntriesByKind;

    const { nodes } = buildNetworkGraph(entries);
    const t1 = nodes.find((n) => n.id === "thoughts/t1")!;
    const c1 = nodes.find((n) => n.id === "claims/c1")!;
    expect(t1.degree).toBe(2);
    expect(c1.degree).toBe(1);
  });

  it("drops edges to unknown nodes instead of crashing", () => {
    const entries = {
      thoughts: [entry("t1", { title: "t1", claims: ["does-not-exist"], inputs: [] })],
    } as unknown as EntriesByKind;

    const { nodes, edges } = buildNetworkGraph(entries);
    expect(nodes).toHaveLength(1);
    expect(edges).toEqual([]);
  });

  it("marks nodes without a public route (provenance) with href: null", () => {
    const entries = {
      provenance: [
        entry("derive-claims-foo", {
          title: "derive-claims-foo",
          event_type: "content_derivation",
          process_id: "p",
          actor: { kind: "llm", model: { provider: "openai", model: "x", tier: "fast" } },
          started_at: "2026-01-01",
          accepted_at: "2026-01-01",
          source_objects: [],
          target_objects: [],
          outcome: "accepted",
        }),
      ],
    } as unknown as EntriesByKind;

    const { nodes } = buildNetworkGraph(entries);
    expect(nodes[0]!.href).toBeNull();
  });
});
