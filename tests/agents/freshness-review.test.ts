import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

/** Fixed "now" ISO for determinism (2026-04-30). */
const NOW_ISO = "2026-04-30T00:00:00.000Z";

/** Creates a temp tree with posts dir; returns root. */
function makeTempTree(): string {
  const root = mkdtempSync(join(tmpdir(), "freshness-review-test-"));
  mkdirSync(join(root, "content", "posts"), { recursive: true });
  return root;
}

/** Write a post with one red-stamped section (verified 120 days ago). */
function writePostWithRedSection(dir: string, slug: string): void {
  writeFileSync(
    join(dir, `${slug}.md`),
    `---\ntitle: ${slug}\ncreated: 2025-01-01\nupdated: 2025-01-01\ntags: []\nrelated_claims: []\nrelated_thoughts: []\n---\n\n## Old Section {#old last_verified="2025-12-31"}\n\nThis content is old.\n`,
    "utf8",
  );
}

/** Write a post with a green-stamped section (verified 5 days ago). */
function writePostWithGreenSection(dir: string, slug: string): void {
  writeFileSync(
    join(dir, `${slug}.md`),
    `---\ntitle: ${slug}\ncreated: 2026-01-01\nupdated: 2026-01-01\ntags: []\nrelated_claims: []\nrelated_thoughts: []\n---\n\n## Fresh Section {#fresh last_verified="2026-04-25"}\n\nThis content is current.\n`,
    "utf8",
  );
}

/** Write a post with no freshness stamps. */
function writePostNoStamps(dir: string, slug: string): void {
  writeFileSync(
    join(dir, `${slug}.md`),
    `---\ntitle: ${slug}\ncreated: 2026-01-01\nupdated: 2026-01-01\ntags: []\nrelated_claims: []\nrelated_thoughts: []\n---\n\n## Plain Section\n\nNo stamp.\n`,
    "utf8",
  );
}

/** Mock runToolCall to return a canned freshness review draft. */
function mockRunToolCall(vi: (typeof import("vite-plus/test"))["vi"]): void {
  vi.doMock("../../src/lib/llm.ts", () => ({
    runToolCall: vi.fn().mockResolvedValue({
      data: {
        whatMayHaveChanged: "The tooling landscape may have changed.",
        recommend: "revise",
        reasoning: "120 days old, significant changes likely.",
      },
      model: { provider: "openai", model: "gpt-test", tier: "balanced" },
    }),
  }));
}

describe("runFreshnessReview — pure function", () => {
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

  it("post with one red-stamped section → 1 proposal", async () => {
    mockRunToolCall(vi);
    const { runFreshnessReview } = await import("../../src/lib/agents/freshness-review.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writePostWithRedSection(join(root, "content", "posts"), "old-post");
    const summary = await runFreshnessReview({
      cwd: root,
      nowISO: NOW_ISO,
      skipLLM: false,
    });
    expect(summary.scanned).toBe(1);
    expect(summary.flagged).toBe(1);
    expect(summary.proposed).toBe(1);
    expect(summary.deduped).toBe(0);
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.type).toBe("post-section-restamp");
  });

  it("post with green stamps → 0 proposals", async () => {
    mockRunToolCall(vi);
    const { runFreshnessReview } = await import("../../src/lib/agents/freshness-review.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writePostWithGreenSection(join(root, "content", "posts"), "fresh-post");
    const summary = await runFreshnessReview({
      cwd: root,
      nowISO: NOW_ISO,
      skipLLM: false,
    });
    expect(summary.scanned).toBe(1);
    expect(summary.flagged).toBe(0);
    expect(summary.proposed).toBe(0);
    expect(readQueue()).toHaveLength(0);
  });

  it("post with no stamps → 0 proposals", async () => {
    mockRunToolCall(vi);
    const { runFreshnessReview } = await import("../../src/lib/agents/freshness-review.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writePostNoStamps(join(root, "content", "posts"), "no-stamps-post");
    const summary = await runFreshnessReview({
      cwd: root,
      nowISO: NOW_ISO,
      skipLLM: false,
    });
    expect(summary.scanned).toBe(1);
    expect(summary.flagged).toBe(0);
    expect(summary.proposed).toBe(0);
    expect(readQueue()).toHaveLength(0);
  });

  it("--no-llm → 0 proposals, flagged > 0, skippedDueToLLM matches flagged", async () => {
    const { runFreshnessReview } = await import("../../src/lib/agents/freshness-review.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writePostWithRedSection(join(root, "content", "posts"), "skip-post");
    const summary = await runFreshnessReview({
      cwd: root,
      nowISO: NOW_ISO,
      skipLLM: true,
    });
    expect(summary.proposed).toBe(0);
    expect(summary.flagged).toBe(1);
    expect(summary.skippedDueToLLM).toBe(1);
    expect(readQueue()).toHaveLength(0);
  });

  it("re-run dedupes — second run proposed=0, deduped=1", async () => {
    mockRunToolCall(vi);
    const { runFreshnessReview } = await import("../../src/lib/agents/freshness-review.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writePostWithRedSection(join(root, "content", "posts"), "dup-post");
    await runFreshnessReview({ cwd: root, nowISO: NOW_ISO, skipLLM: false });
    const second = await runFreshnessReview({
      cwd: root,
      nowISO: NOW_ISO,
      skipLLM: false,
    });
    expect(second.proposed).toBe(0);
    expect(second.deduped).toBe(1);
    expect(readQueue()).toHaveLength(1);
  });

  it("re-run produces the same proposal id (determinism)", async () => {
    mockRunToolCall(vi);
    const { runFreshnessReview } = await import("../../src/lib/agents/freshness-review.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writePostWithRedSection(join(root, "content", "posts"), "det-post");
    await runFreshnessReview({ cwd: root, nowISO: NOW_ISO, skipLLM: false });
    const firstId = readQueue()[0]?.id;
    await runFreshnessReview({ cwd: root, nowISO: NOW_ISO, skipLLM: false });
    expect(readQueue()[0]?.id).toBe(firstId);
  });

  it("custom thresholdDays: amber section (50 days) flagged when threshold is 45", async () => {
    mockRunToolCall(vi);
    const { runFreshnessReview } = await import("../../src/lib/agents/freshness-review.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeFileSync(
      join(root, "content", "posts", "amber-post.md"),
      `---\ntitle: amber\ncreated: 2026-01-01\nupdated: 2026-01-01\ntags: []\nrelated_claims: []\nrelated_thoughts: []\n---\n\n## Amber {#amber last_verified="2026-03-11"}\n\nContent.\n`,
      "utf8",
    );
    const summary = await runFreshnessReview({
      cwd: root,
      nowISO: NOW_ISO,
      skipLLM: false,
      thresholdDays: 45,
    });
    expect(summary.flagged).toBe(1);
    expect(readQueue()).toHaveLength(1);
  });
});
