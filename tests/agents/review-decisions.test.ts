import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Writes a minimal standing decision with a given follow_up_on date. */
function writeDecision(dir: string, slug: string, followUpOn: string, status = "standing"): void {
  writeFileSync(
    join(dir, `${slug}.md`),
    `---\ndecision: "Use ${slug}"\ndate: 2026-01-01\nstatus: ${status}\nchosen: "${slug}"\nfollow_up_on: ${followUpOn}\noptions_considered: []\nreverses: []\nrelated_claims: []\nrelated_projects: []\ntags: []\n---\nBody.\n`,
    "utf8",
  );
}

/** Fixed "now" ISO used in all pure-function tests for determinism. */
const NOW_ISO = "2026-04-30T00:00:00.000Z";

describe("runReviewDecisions — pure function", () => {
  let root = "";

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "review-decisions-test-"));
    mkdirSync(join(root, "content", "decisions"), { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(root);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  it("emits one proposal for a standing decision with past follow_up_on", async () => {
    const { runReviewDecisions } = await import("../../src/lib/agents/review-decisions.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeDecision(join(root, "content", "decisions"), "use-astro", "2026-01-01");
    const summary = runReviewDecisions({ cwd: root, nowISO: NOW_ISO });
    expect(summary.scanned).toBe(1);
    expect(summary.proposed).toBe(1);
    expect(summary.deduped).toBe(0);
    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0]?.type).toBe("decision-followup-due");
  });

  it("skips reversed decisions even with past follow_up_on", async () => {
    const { runReviewDecisions } = await import("../../src/lib/agents/review-decisions.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeDecision(join(root, "content", "decisions"), "reversed-adr", "2026-01-01", "reversed");
    const summary = runReviewDecisions({ cwd: root, nowISO: NOW_ISO });
    expect(summary.scanned).toBe(0);
    expect(summary.proposed).toBe(0);
    expect(readQueue()).toHaveLength(0);
  });

  it("skips decisions with future follow_up_on", async () => {
    const { runReviewDecisions } = await import("../../src/lib/agents/review-decisions.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeDecision(join(root, "content", "decisions"), "future-adr", "2027-01-01");
    const summary = runReviewDecisions({ cwd: root, nowISO: NOW_ISO });
    expect(summary.scanned).toBe(1);
    expect(summary.proposed).toBe(0);
    expect(readQueue()).toHaveLength(0);
  });

  it("dedupes on rerun — second call produces 0 new proposals", async () => {
    const { runReviewDecisions } = await import("../../src/lib/agents/review-decisions.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeDecision(join(root, "content", "decisions"), "use-sqlite", "2026-01-01");
    runReviewDecisions({ cwd: root, nowISO: NOW_ISO });
    const second = runReviewDecisions({ cwd: root, nowISO: NOW_ISO });
    expect(second.proposed).toBe(0);
    expect(second.deduped).toBe(1);
    expect(readQueue()).toHaveLength(1);
  });

  it("skips superseded decisions", async () => {
    const { runReviewDecisions } = await import("../../src/lib/agents/review-decisions.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeDecision(join(root, "content", "decisions"), "superseded-adr", "2026-01-01", "superseded");
    const summary = runReviewDecisions({ cwd: root, nowISO: NOW_ISO });
    expect(summary.scanned).toBe(0);
    expect(summary.proposed).toBe(0);
    expect(readQueue()).toHaveLength(0);
  });

  it("scans 0 decisions when decisions dir is absent", async () => {
    const { runReviewDecisions } = await import("../../src/lib/agents/review-decisions.ts");
    const emptyRoot = mkdtempSync(join(tmpdir(), "review-decisions-empty-"));
    vi.spyOn(process, "cwd").mockReturnValue(emptyRoot);
    try {
      const summary = runReviewDecisions({ cwd: emptyRoot, nowISO: NOW_ISO });
      expect(summary.scanned).toBe(0);
      expect(summary.proposed).toBe(0);
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  it("decision without follow_up_on is not proposed", async () => {
    const { runReviewDecisions } = await import("../../src/lib/agents/review-decisions.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeFileSync(
      join(root, "content", "decisions", "no-followup.md"),
      `---\ndecision: "No follow up"\ndate: 2026-01-01\nstatus: standing\nchosen: "yes"\noptions_considered: []\nreverses: []\nrelated_claims: []\nrelated_projects: []\ntags: []\n---\nBody.\n`,
      "utf8",
    );
    const summary = runReviewDecisions({ cwd: root, nowISO: NOW_ISO });
    expect(summary.proposed).toBe(0);
    expect(readQueue()).toHaveLength(0);
  });
});
