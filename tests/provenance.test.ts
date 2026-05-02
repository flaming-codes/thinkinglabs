import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { provenanceEventSchema } from "../src/schemas/provenance.ts";
import { objectRef, provenanceSlug, writeProvenanceEvent } from "../src/lib/provenance.ts";

describe("provenance contract and writer", () => {
  let root = "";

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "provenance-test-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("writes deterministic validated provenance markdown", () => {
    const file = writeProvenanceEvent({
      cwd: root,
      title: "AI provenance for test claim",
      process_id: "derive-claims",
      event_type: "content_derivation",
      actor: {
        kind: "llm",
        model: { provider: "ollama", model: "glm-5.1:cloud", tier: "balanced" },
      },
      started_at: "2026-05-02T10:00:00.000Z",
      accepted_at: "2026-05-02T10:01:00.000Z",
      source_objects: [objectRef("thoughts", "source-thought")],
      target_objects: [objectRef("claims", "derived-claim")],
      outcome: "accepted",
      tags: ["ai", "claims"],
    });
    expect(existsSync(file)).toBe(true);
    expect(file).toContain("derive-claims-20260502100100-");
    const parsed = matter(readFileSync(file, "utf8"));
    const event = provenanceEventSchema.parse(parsed.data);
    expect(event.actor.model).toEqual({
      provider: "ollama",
      model: "glm-5.1:cloud",
      tier: "balanced",
    });
    expect(event.source_objects[0]?.id).toBe("thoughts/source-thought");
    expect(event.target_objects[0]?.id).toBe("claims/derived-claim");
  });

  it("rejects malformed model refs and object refs", () => {
    expect(() =>
      writeProvenanceEvent({
        cwd: root,
        title: "Bad provenance",
        process_id: "derive-claims",
        event_type: "content_derivation",
        actor: {
          kind: "llm",
          model: { provider: "bad" as "ollama", model: "", tier: "balanced" },
        },
        started_at: "2026-05-02T10:00:00.000Z",
        accepted_at: "2026-05-02T10:01:00.000Z",
        source_objects: [{ id: "../bad" }],
        target_objects: [],
        outcome: "accepted",
        tags: [],
      }),
    ).toThrow();
  });

  it("uses the same slug for the same accepted event", () => {
    const event = provenanceEventSchema.parse({
      title: "Stable",
      event_type: "content_derivation",
      process_id: "derive-claims",
      actor: {
        kind: "llm",
        model: { provider: "openai", model: "gpt-4.1", tier: "balanced" },
      },
      started_at: "2026-05-02T10:00:00.000Z",
      accepted_at: "2026-05-02T10:01:00.000Z",
      source_objects: [objectRef("thoughts", "a")],
      target_objects: [objectRef("claims", "b")],
      outcome: "edited",
      tags: [],
    });
    expect(provenanceSlug(event)).toBe(provenanceSlug(event));
  });
});
