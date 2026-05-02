import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

/** Writes a minimal pending prediction file; returns the absolute path. */
function writePrediction(dir: string, slug: string): string {
  const path = join(dir, `${slug}.md`);
  writeFileSync(
    path,
    `---\nprediction: "Test prediction."\nmade: 2025-01-01\nresolves: 2026-01-01\nconfidence: 0.7\nresolution: pending\nresolved_on: null\nresolution_note: null\nevidence_at_time: []\ntags: []\n---\nBody.\n`,
    "utf8",
  );
  return path;
}

/** Builds a minimal prediction-resolve QueuedProposal. */
function makeProposal(
  target: string,
  resolution: "true" | "false" | "ambiguous" = "true",
): import("../../src/lib/proposal-queue.ts").QueuedProposal & {
  payload: import("../../src/lib/agents/resolve-predictions.ts").PredictionResolvePayload;
} {
  const payload = {
    resolution,
    resolution_note: "Prediction resolved correctly.",
    reasoning: "Based on available evidence.",
    resolvedOnISO: "2026-04-30T00:00:00.000Z",
  };
  return {
    id: "test-resolve-id",
    source: "resolve-predictions",
    type: "prediction-resolve",
    createdAt: "2026-04-30T00:00:00.000Z",
    target,
    title: "Resolve prediction: test",
    preview: "test resolves as true.",
    payload,
  };
}

describe("prediction-resolve handler", () => {
  let root = "";
  let predictionsDir = "";

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "resolve-pred-handler-"));
    predictionsDir = join(root, "content", "predictions");
    mkdirSync(predictionsDir, { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(root);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    rmSync(root, { recursive: true, force: true });
  });

  it("apply sets resolution, resolution_note, resolved_on; leaves confidence and evidence unchanged", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/resolve-predictions.ts");
    const target = writePrediction(predictionsDir, "apply-test");
    const proposal = makeProposal(target, "true");
    const handler = getHandler("prediction-resolve");
    await handler.apply(proposal, { cwd: root });
    const { data } = matter(readFileSync(target, "utf8"));
    expect(data["resolution"]).toBe("true");
    expect(data["resolution_note"]).toBe("Prediction resolved correctly.");
    expect(data["resolved_on"]).toBe("2026-04-30");
    expect(data["confidence"]).toBe(0.7);
    expect(data["evidence_at_time"]).toEqual([]);
  });

  it("apply with resolution=false works correctly", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/resolve-predictions.ts");
    const target = writePrediction(predictionsDir, "false-test");
    const proposal = makeProposal(target, "false");
    const handler = getHandler("prediction-resolve");
    await handler.apply(proposal, { cwd: root });
    const { data } = matter(readFileSync(target, "utf8"));
    expect(data["resolution"]).toBe("false");
    expect(data["resolved_on"]).toBe("2026-04-30");
  });

  it("apply with resolution=ambiguous works correctly", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/resolve-predictions.ts");
    const target = writePrediction(predictionsDir, "ambig-test");
    const proposal = makeProposal(target, "ambiguous");
    const handler = getHandler("prediction-resolve");
    await handler.apply(proposal, { cwd: root });
    const { data } = matter(readFileSync(target, "utf8"));
    expect(data["resolution"]).toBe("ambiguous");
  });

  it("edit opens $EDITOR (EDITOR=cat) and returns summary", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/resolve-predictions.ts");
    const target = writePrediction(predictionsDir, "edit-test");
    const proposal = makeProposal(target);
    const prev = process.env["EDITOR"];
    process.env["EDITOR"] = "cat";
    try {
      const handler = getHandler("prediction-resolve");
      const result = await handler.edit(proposal, { cwd: root });
      expect(result).toContain("edit-test");
    } finally {
      if (prev === undefined) delete process.env["EDITOR"];
      else process.env["EDITOR"] = prev;
    }
  });

  it("reject appends entry to rejections file", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    const { readJsonState } = await import("../../src/lib/json-state.ts");
    await import("../../src/lib/agents/resolve-predictions.ts");
    const target = writePrediction(predictionsDir, "reject-test");
    const proposal = makeProposal(target);
    const handler = getHandler("prediction-resolve");
    if (handler.reject) await handler.reject(proposal, { cwd: root });
    const rejections = readJsonState<Array<{ slug: string; predictionLastModified: string }>>(
      join(root, ".resolve-predictions-rejections.json"),
      [],
    );
    expect(rejections).toHaveLength(1);
    expect(rejections[0]?.slug).toBe("reject-test");
  });

  it("apply throws when target is null", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/resolve-predictions.ts");
    const proposal = makeProposal("null-target");
    const noTarget = { ...proposal, target: null };
    const handler = getHandler("prediction-resolve");
    await expect(handler.apply(noTarget, { cwd: root })).rejects.toThrow("missing target path");
  });
});
