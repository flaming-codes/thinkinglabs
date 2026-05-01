import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/** Minimal claim frontmatter writer. */
function writeClaimFile(dir: string, slug: string, lastReviewed: string, extra: Record<string, unknown> = {}): void {
  const data = { claim: "Test claim.", confidence: 0.7, last_reviewed: lastReviewed, status: "active", ...extra };
  const fm = Object.entries(data).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n");
  writeFileSync(join(dir, `${slug}.md`), `---\n${fm}\n---\nBody.\n`, "utf8");
}

describe("detectStaleClaims — pure logic", () => {
  let root: string;
  let contentRoot: string;
  let claimsDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "stale-claims-test-"));
    contentRoot = join(root, "content");
    claimsDir = join(contentRoot, "claims");
    mkdirSync(claimsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("produces no flags when claims dir is empty", async () => {
    const { detectStaleClaims } = await import("../src/lib/review-stale-claims.ts");
    const flags = await detectStaleClaims({ cwd: root, contentRoot, nowISO: "2026-04-30T00:00:00.000Z", thresholdDays: 90, skipLLM: true });
    expect(flags).toEqual([]);
  });

  it("fires past-threshold at exactly thresholdDays + 1 since review", async () => {
    const { detectStaleClaims } = await import("../src/lib/review-stale-claims.ts");
    /** 91 days before 2026-04-30 = 2026-01-29. */
    writeClaimFile(claimsDir, "old-claim", "2026-01-29");
    const flags = await detectStaleClaims({ cwd: root, contentRoot, nowISO: "2026-04-30T00:00:00.000Z", thresholdDays: 90, skipLLM: true });
    expect(flags).toHaveLength(1);
    expect(flags[0]!.slug).toBe("old-claim");
    expect(flags[0]!.reasons).toContain("past-threshold");
  });

  it("does not fire past-threshold at thresholdDays - 1 since review", async () => {
    const { detectStaleClaims } = await import("../src/lib/review-stale-claims.ts");
    /** 89 days before 2026-04-30 = 2026-01-31. */
    writeClaimFile(claimsDir, "fresh-claim", "2026-01-31");
    const flags = await detectStaleClaims({ cwd: root, contentRoot, nowISO: "2026-04-30T00:00:00.000Z", thresholdDays: 90, skipLLM: true });
    expect(flags).toHaveLength(0);
  });

  it("skipLLM=true produces no evidence-shift or contradicting-thought reasons", async () => {
    const { detectStaleClaims } = await import("../src/lib/review-stale-claims.ts");
    writeClaimFile(claimsDir, "stale-claim", "2026-01-01", { tags: ["ai"] });
    const thoughtsDir = join(contentRoot, "thoughts");
    mkdirSync(thoughtsDir, { recursive: true });
    writeFileSync(join(thoughtsDir, "new-thought.md"), "---\ntitle: New\ncreated: \"2026-04-01\"\nupdated: \"2026-04-01\"\ntags:\n  - ai\n---\nNew content.\n", "utf8");
    const flags = await detectStaleClaims({ cwd: root, contentRoot, nowISO: "2026-04-30T00:00:00.000Z", thresholdDays: 90, skipLLM: true });
    for (const f of flags) {
      expect(f.reasons).not.toContain("evidence-shift");
      expect(f.reasons).not.toContain("contradicting-thought");
    }
  });

  it("with mocked LLM returning shifted=true the flag carries evidence-shift", async () => {
    vi.doMock("../src/lib/llm.ts", () => ({
      runToolCall: async () => ({ shifted: true, contradicts: false, reasoning: "New evidence found." }),
    }));
    const { detectStaleClaims } = await import("../src/lib/review-stale-claims.ts");
    writeClaimFile(claimsDir, "shifting-claim", "2026-01-01", { tags: ["ai"] });
    const thoughtsDir = join(contentRoot, "thoughts");
    mkdirSync(thoughtsDir, { recursive: true });
    writeFileSync(join(thoughtsDir, "new-thought.md"), "---\ntitle: New\ncreated: \"2026-04-01\"\nupdated: \"2026-04-01\"\ntags:\n  - ai\n---\nNew content.\n", "utf8");
    const flags = await detectStaleClaims({ cwd: root, contentRoot, nowISO: "2026-04-30T00:00:00.000Z", thresholdDays: 90, skipLLM: false });
    const flag = flags.find((f) => f.slug === "shifting-claim");
    expect(flag).toBeDefined();
    expect(flag!.reasons).toContain("evidence-shift");
    vi.doUnmock("../src/lib/llm.ts");
  });

  it("orders flags by daysSinceReview descending", async () => {
    const { detectStaleClaims } = await import("../src/lib/review-stale-claims.ts");
    writeClaimFile(claimsDir, "newer", "2026-01-20");
    writeClaimFile(claimsDir, "older", "2026-01-01");
    const flags = await detectStaleClaims({ cwd: root, contentRoot, nowISO: "2026-04-30T00:00:00.000Z", thresholdDays: 90, skipLLM: true });
    if (flags.length >= 2) {
      expect(flags[0]!.daysSinceReview).toBeGreaterThanOrEqual(flags[1]!.daysSinceReview);
    }
  });

  it("fires deprecation-candidate for claims inactive >180 days with no related newer objects", async () => {
    const { detectStaleClaims } = await import("../src/lib/review-stale-claims.ts");
    /** 200 days before 2026-04-30 ≈ 2025-10-12. */
    writeClaimFile(claimsDir, "forgotten", "2025-10-12");
    const flags = await detectStaleClaims({ cwd: root, contentRoot, nowISO: "2026-04-30T00:00:00.000Z", thresholdDays: 90, skipLLM: true });
    const flag = flags.find((f) => f.slug === "forgotten");
    expect(flag).toBeDefined();
    expect(flag!.reasons).toContain("deprecation-candidate");
  });

  it("does not fire deprecation-candidate below 180 days", async () => {
    const { detectStaleClaims } = await import("../src/lib/review-stale-claims.ts");
    /** 170 days before 2026-04-30 ≈ 2025-11-11. */
    writeClaimFile(claimsDir, "just-stale", "2025-11-11");
    const flags = await detectStaleClaims({ cwd: root, contentRoot, nowISO: "2026-04-30T00:00:00.000Z", thresholdDays: 90, skipLLM: true });
    const flag = flags.find((f) => f.slug === "just-stale");
    if (flag) {
      expect(flag.reasons).not.toContain("deprecation-candidate");
    }
  });
});
