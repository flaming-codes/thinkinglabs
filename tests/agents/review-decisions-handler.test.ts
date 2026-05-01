import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

/** Writes a minimal standing decision file; returns the absolute path. */
function writeDecision(dir: string, slug: string): string {
  const path = join(dir, `${slug}.md`);
  writeFileSync(
    path,
    `---\ndecision: "Use ${slug}"\ndate: 2026-01-01\nstatus: standing\nchosen: "${slug}"\nfollow_up_on: 2026-01-01\noptions_considered: []\nreverses: []\nrelated_claims: []\nrelated_projects: []\ntags: []\n---\nBody.\n`,
    "utf8",
  );
  return path;
}

/** Builds a minimal decision-followup-due QueuedProposal. */
function makeProposal(target: string): import("../../src/lib/proposal-queue.ts").QueuedProposal & {
  payload: import("../../src/lib/agents/review-decisions.ts").DecisionFollowupPayload;
} {
  const payload = {
    followUpOnISO: "2026-01-01",
    daysOverdue: 119,
    decisionTitle: "Use test-decision",
  };
  return {
    id: "test-review-decision-id",
    source: "review-decisions",
    type: "decision-followup-due",
    createdAt: "2026-04-30T00:00:00.000Z",
    target,
    title: "Review decision: test-decision",
    preview: "119 days overdue.",
    payload,
  };
}

describe("review-decisions handler", () => {
  let root = "";
  let decisionsDir = "";

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "review-decisions-handler-"));
    decisionsDir = join(root, "content", "decisions");
    mkdirSync(decisionsDir, { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(root);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  it("apply opens $EDITOR (EDITOR=cat no-op) and validates", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/review-decisions.ts");
    const target = writeDecision(decisionsDir, "use-astro");
    const proposal = makeProposal(target);
    const prev = process.env["EDITOR"];
    process.env["EDITOR"] = "cat";
    try {
      const handler = getHandler("decision-followup-due");
      const result = await handler.apply(proposal);
      expect(result).toContain("use-astro");
    } finally {
      if (prev === undefined) delete process.env["EDITOR"];
      else process.env["EDITOR"] = prev;
    }
  });

  it("edit is equivalent to apply (both open editor)", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/review-decisions.ts");
    const target = writeDecision(decisionsDir, "use-sqlite");
    const proposal = makeProposal(target);
    const prev = process.env["EDITOR"];
    process.env["EDITOR"] = "cat";
    try {
      const handler = getHandler("decision-followup-due");
      const applyResult = await handler.apply(proposal);
      const editResult = await handler.edit(proposal);
      expect(applyResult).toBe(editResult);
    } finally {
      if (prev === undefined) delete process.env["EDITOR"];
      else process.env["EDITOR"] = prev;
    }
  });

  it("reject appends to rejections file with slug and followUpOnISO", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    const { readJsonState } = await import("../../src/lib/json-state.ts");
    await import("../../src/lib/agents/review-decisions.ts");
    const target = writeDecision(decisionsDir, "reject-decision");
    const proposal = makeProposal(target);
    const handler = getHandler("decision-followup-due");
    if (handler.reject) await handler.reject(proposal);
    const rejections = readJsonState<Array<{ slug: string; followUpOnISO: string }>>(
      join(root, ".review-decisions-rejections.json"),
      [],
    );
    expect(rejections).toHaveLength(1);
    expect(rejections[0]?.slug).toBe("reject-decision");
    expect(rejections[0]?.followUpOnISO).toBe("2026-01-01");
  });

  it("reject then rerun skips the rejected decision", async () => {
    await import("../../src/lib/agents/review-decisions.ts");
    const { runReviewDecisions } = await import("../../src/lib/agents/review-decisions.ts");
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");

    writeDecision(decisionsDir, "repeated-decision");
    const summary1 = runReviewDecisions({ cwd: root, nowISO: "2026-04-30T00:00:00.000Z" });
    expect(summary1.proposed).toBe(1);

    const queue = readQueue();
    const entry = queue[0]!;
    const typed = {
      ...entry,
      payload:
        entry.payload as import("../../src/lib/agents/review-decisions.ts").DecisionFollowupPayload,
    };
    const handler = getHandler("decision-followup-due");
    if (handler.reject) await handler.reject(typed);

    const summary2 = runReviewDecisions({ cwd: root, nowISO: "2026-04-30T00:00:00.000Z" });
    expect(summary2.proposed).toBe(0);
  });
});
