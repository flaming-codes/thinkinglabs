import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

/** Fixed "now" ISO for determinism. */
const NOW_ISO = "2026-04-30T00:00:00.000Z";

/** Past resolve date. */
const RESOLVED_PAST = "2026-01-01";

/** Future resolve date. */
const RESOLVED_FUTURE = "2027-01-01";

/** Write a minimal prediction file; returns the path. */
function writePrediction(dir: string, slug: string, resolution: string, resolves: string): string {
  const path = join(dir, `${slug}.md`);
  writeFileSync(
    path,
    `---\nprediction: "Test prediction for ${slug}."\nmade: 2025-01-01\nresolves: ${resolves}\nconfidence: 0.7\nresolution: ${resolution}\nresolved_on: null\nresolution_note: null\nevidence_at_time: []\ntags: []\n---\nBody.\n`,
    "utf8",
  );
  return path;
}

/** Creates a temp tree with predictions dir; returns root. */
function makeTempTree(): string {
  const root = mkdtempSync(join(tmpdir(), "resolve-predictions-test-"));
  mkdirSync(join(root, "content", "predictions"), { recursive: true });
  mkdirSync(join(root, "content", "inputs"), { recursive: true });
  return root;
}

/** Mock runToolCall to return a canned resolution draft. */
function mockRunToolCall(vi: (typeof import("vitest"))["vi"]): void {
  vi.doMock("../../src/lib/llm.ts", () => ({
    runToolCall: vi.fn().mockResolvedValue({
      data: {
        resolution: "true",
        resolution_note: "The prediction came true.",
        reasoning: "Evidence supports it.",
      },
      model: { provider: "openai", model: "gpt-test", tier: "balanced" },
    }),
  }));
}

describe("runResolvePredictions — pure function", () => {
  let root = "";

  beforeEach(() => {
    root = makeTempTree();
    vi.spyOn(process, "cwd").mockReturnValue(root);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    rmSync(root, { recursive: true, force: true });
  });

  it("pending prediction past resolves date → 1 proposal with mocked LLM", async () => {
    mockRunToolCall(vi);
    const { runResolvePredictions } = await import("../../src/lib/agents/resolve-predictions.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writePrediction(join(root, "content", "predictions"), "test-pred", "pending", RESOLVED_PAST);
    const summary = await runResolvePredictions({ cwd: root, nowISO: NOW_ISO, skipLLM: false });
    expect(summary.scanned).toBe(1);
    expect(summary.proposed).toBe(1);
    expect(summary.deduped).toBe(0);
    expect(summary.skippedDueToLLM).toBe(0);
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.type).toBe("prediction-resolve");
  });

  it("pending prediction with future resolves date → 0 proposals", async () => {
    mockRunToolCall(vi);
    const { runResolvePredictions } = await import("../../src/lib/agents/resolve-predictions.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writePrediction(
      join(root, "content", "predictions"),
      "future-pred",
      "pending",
      RESOLVED_FUTURE,
    );
    const summary = await runResolvePredictions({ cwd: root, nowISO: NOW_ISO, skipLLM: false });
    expect(summary.scanned).toBe(0);
    expect(summary.proposed).toBe(0);
    expect(readQueue()).toHaveLength(0);
  });

  it("already resolved prediction → 0 proposals", async () => {
    mockRunToolCall(vi);
    const { runResolvePredictions } = await import("../../src/lib/agents/resolve-predictions.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writePrediction(join(root, "content", "predictions"), "resolved-pred", "true", RESOLVED_PAST);
    const summary = await runResolvePredictions({ cwd: root, nowISO: NOW_ISO, skipLLM: false });
    expect(summary.scanned).toBe(0);
    expect(summary.proposed).toBe(0);
    expect(readQueue()).toHaveLength(0);
  });

  it("ambiguous resolution → 0 proposals", async () => {
    mockRunToolCall(vi);
    const { runResolvePredictions } = await import("../../src/lib/agents/resolve-predictions.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writePrediction(join(root, "content", "predictions"), "ambig-pred", "ambiguous", RESOLVED_PAST);
    const summary = await runResolvePredictions({ cwd: root, nowISO: NOW_ISO, skipLLM: false });
    expect(summary.scanned).toBe(0);
    expect(summary.proposed).toBe(0);
    expect(readQueue()).toHaveLength(0);
  });

  it("--no-llm → 0 proposals, skippedDueToLLM counts pending+overdue", async () => {
    const { runResolvePredictions } = await import("../../src/lib/agents/resolve-predictions.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writePrediction(join(root, "content", "predictions"), "skip-a", "pending", RESOLVED_PAST);
    writePrediction(join(root, "content", "predictions"), "skip-b", "pending", RESOLVED_PAST);
    const summary = await runResolvePredictions({ cwd: root, nowISO: NOW_ISO, skipLLM: true });
    expect(summary.proposed).toBe(0);
    expect(summary.skippedDueToLLM).toBe(2);
    expect(readQueue()).toHaveLength(0);
  });

  it("re-run dedupes via proposalId — second run proposed=0, deduped=1", async () => {
    mockRunToolCall(vi);
    const { runResolvePredictions } = await import("../../src/lib/agents/resolve-predictions.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writePrediction(join(root, "content", "predictions"), "dup-pred", "pending", RESOLVED_PAST);
    await runResolvePredictions({ cwd: root, nowISO: NOW_ISO, skipLLM: false });
    const second = await runResolvePredictions({ cwd: root, nowISO: NOW_ISO, skipLLM: false });
    expect(second.proposed).toBe(0);
    expect(second.deduped).toBe(1);
    expect(readQueue()).toHaveLength(1);
  });

  it("re-run produces the same proposal id (determinism)", async () => {
    mockRunToolCall(vi);
    const { runResolvePredictions } = await import("../../src/lib/agents/resolve-predictions.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writePrediction(join(root, "content", "predictions"), "det-pred", "pending", RESOLVED_PAST);
    await runResolvePredictions({ cwd: root, nowISO: NOW_ISO, skipLLM: false });
    const firstId = readQueue()[0]?.id;
    await runResolvePredictions({ cwd: root, nowISO: NOW_ISO, skipLLM: false });
    expect(readQueue()[0]?.id).toBe(firstId);
  });
});
