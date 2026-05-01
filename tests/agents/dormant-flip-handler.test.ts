import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

/** Writes a minimal alive project file; returns the absolute path. */
function writeProject(dir: string, slug: string): string {
  const path = join(dir, `${slug}.md`);
  writeFileSync(
    path,
    `---\ntitle: ${slug}\nstatus: alive\nstarted: 2026-01-01\nlast_touched: 2025-12-01\ntags: []\nlinks: {}\nrelated_thoughts: []\nrelated_claims: []\n---\nBody.\n`,
    "utf8",
  );
  return path;
}

/** Builds a minimal project-flip-dormant QueuedProposal. */
function makeProposal(target: string): import("../../src/lib/proposal-queue.ts").QueuedProposal & {
  payload: import("../../src/lib/agents/dormant-flip.ts").DormantFlipPayload;
} {
  const payload = {
    daysSinceTouched: 100,
    thresholdDays: 60,
    lastTouchedISO: "2025-12-01T00:00:00.000Z",
  };
  return {
    id: "test-dormant-flip-id",
    source: "dormant-flip",
    type: "project-flip-dormant",
    createdAt: "2026-04-30T00:00:00.000Z",
    target,
    title: "Flip test-project dormant",
    preview: "100 days inactive.",
    payload,
  };
}

describe("dormant-flip handler", () => {
  let root = "";
  let projectsDir = "";

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "dormant-flip-handler-"));
    projectsDir = join(root, "content", "projects");
    mkdirSync(projectsDir, { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(root);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  it("apply flips status to dormant", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/dormant-flip.ts");
    const target = writeProject(projectsDir, "my-project");
    const proposal = makeProposal(target);
    const handler = getHandler("project-flip-dormant");
    await handler.apply(proposal);
    const { data } = matter(readFileSync(target, "utf8"));
    expect(data["status"]).toBe("dormant");
  });

  it("edit opens $EDITOR and validates written content (EDITOR=cat)", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/dormant-flip.ts");
    const target = writeProject(projectsDir, "edit-project");
    const proposal = makeProposal(target);
    const prev = process.env["EDITOR"];
    process.env["EDITOR"] = "cat";
    try {
      const handler = getHandler("project-flip-dormant");
      const result = await handler.edit(proposal);
      expect(result).toContain("edit-project");
    } finally {
      if (prev === undefined) delete process.env["EDITOR"];
      else process.env["EDITOR"] = prev;
    }
  });

  it("reject appends to rejections file and slug matches", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    const { readJsonState } = await import("../../src/lib/json-state.ts");
    await import("../../src/lib/agents/dormant-flip.ts");
    const target = writeProject(projectsDir, "reject-project");
    const proposal = makeProposal(target);
    const handler = getHandler("project-flip-dormant");
    if (handler.reject) await handler.reject(proposal);
    const rejections = readJsonState<Array<{ slug: string; lastTouchedISO: string | null }>>(
      join(root, ".dormant-flip-rejections.json"),
      [],
    );
    expect(rejections).toHaveLength(1);
    expect(rejections[0]?.slug).toBe("reject-project");
    expect(rejections[0]?.lastTouchedISO).toBe("2025-12-01T00:00:00.000Z");
  });

  it("reject then rerun skips the rejected project", async () => {
    await import("../../src/lib/agents/dormant-flip.ts");
    const { runDormantFlip } = await import("../../src/lib/agents/dormant-flip.ts");
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");

    writeProject(projectsDir, "future-dormant");
    const summary1 = runDormantFlip({
      cwd: root,
      nowISO: "2026-04-30T00:00:00.000Z",
      thresholdDays: 60,
    });
    expect(summary1.proposed).toBe(1);

    const queue = readQueue();
    const proposal = queue[0]!;
    const typed = {
      ...proposal,
      payload: {
        daysSinceTouched: 100,
        thresholdDays: 60,
        lastTouchedISO: (proposal.payload as { lastTouchedISO: string }).lastTouchedISO,
      },
    };
    const handler = getHandler("project-flip-dormant");
    if (handler.reject) await handler.reject(typed);

    vi.spyOn(process, "cwd").mockReturnValue(root);
    const { enqueue: _e, readQueue: _r } = await import("../../src/lib/proposal-queue.ts");
    void _e;
    void _r;

    const summary2 = runDormantFlip({
      cwd: root,
      nowISO: "2026-04-30T00:00:00.000Z",
      thresholdDays: 60,
    });
    expect(summary2.proposed).toBe(0);
  });
});
