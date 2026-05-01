import { existsSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { writeJsonState } from "../src/lib/json-state.ts";

/** Stubs process.cwd() to the given dir so queue functions resolve to it. */
function useTmpDir(): { getDir: () => string } {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "proposal-queue-"));
    vi.spyOn(process, "cwd").mockReturnValue(dir);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });
  return { getDir: () => dir };
}

/** Builds a minimal valid QueuedProposal. */
function makeProposal(
  overrides: Partial<import("../src/lib/proposal-queue.ts").QueuedProposal> = {},
): import("../src/lib/proposal-queue.ts").QueuedProposal {
  return {
    id: "test-id-1",
    source: "dormant-flip",
    type: "project-flip-dormant",
    createdAt: "2026-01-01T00:00:00.000Z",
    target: "content/projects/my-project.md",
    title: "Flip project dormant",
    preview: "Project has been inactive for 60 days.",
    payload: { threshold: 60 },
    ...overrides,
  };
}

describe("proposal-queue", () => {
  useTmpDir();

  it("enqueue then readQueue returns one item", async () => {
    const { enqueue, readQueue } = await import("../src/lib/proposal-queue.ts");
    const proposal = makeProposal();
    enqueue(proposal);
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ id: "test-id-1", source: "dormant-flip" });
  });

  it("enqueue with same id twice results in only one entry", async () => {
    const { enqueue, readQueue } = await import("../src/lib/proposal-queue.ts");
    const proposal = makeProposal();
    enqueue(proposal);
    enqueue(proposal);
    expect(readQueue()).toHaveLength(1);
  });

  it("honors an explicit cwd independent of process.cwd()", async () => {
    const { enqueue, readQueue } = await import("../src/lib/proposal-queue.ts");
    const explicit = mkdtempSync(join(tmpdir(), "proposal-explicit-"));
    try {
      enqueue(makeProposal(), explicit);
      expect(readQueue(explicit)).toHaveLength(1);
      expect(readQueue()).toHaveLength(0);
    } finally {
      rmSync(explicit, { recursive: true, force: true });
    }
  });

  it("enqueue with different ids preserves createdAt-asc sort order", async () => {
    const { enqueue, readQueue } = await import("../src/lib/proposal-queue.ts");
    const p1 = makeProposal({ id: "id-a", createdAt: "2026-01-03T00:00:00.000Z" });
    const p2 = makeProposal({ id: "id-b", createdAt: "2026-01-01T00:00:00.000Z" });
    const p3 = makeProposal({ id: "id-c", createdAt: "2026-01-02T00:00:00.000Z" });
    enqueue(p1);
    enqueue(p2);
    enqueue(p3);
    const ids = readQueue().map((p) => p.id);
    expect(ids).toEqual(["id-b", "id-c", "id-a"]);
  });

  it("removeFromQueue removes one and leaves others", async () => {
    const { enqueue, readQueue, removeFromQueue } = await import("../src/lib/proposal-queue.ts");
    enqueue(makeProposal({ id: "keep-1", createdAt: "2026-01-01T00:00:00.000Z" }));
    enqueue(makeProposal({ id: "remove-me", createdAt: "2026-01-02T00:00:00.000Z" }));
    enqueue(makeProposal({ id: "keep-2", createdAt: "2026-01-03T00:00:00.000Z" }));
    removeFromQueue("remove-me");
    const ids = readQueue().map((p) => p.id);
    expect(ids).toEqual(["keep-1", "keep-2"]);
  });

  it("proposalId is deterministic across runs and across object-key permutations of payload", async () => {
    const { proposalId } = await import("../src/lib/proposal-queue.ts");
    const id1 = proposalId("dormant-flip", "project-flip-dormant", "content/projects/foo.md", {
      b: 2,
      a: 1,
    });
    const id2 = proposalId("dormant-flip", "project-flip-dormant", "content/projects/foo.md", {
      a: 1,
      b: 2,
    });
    expect(id1).toBe(id2);
    expect(typeof id1).toBe("string");
    expect(id1).toHaveLength(64);
  });

  it("a malformed queue file causes readQueue to return [] without throwing", async () => {
    const { readQueue } = await import("../src/lib/proposal-queue.ts");
    const dir = process.cwd();
    writeJsonState(join(dir, ".proposal-queue.json"), { proposals: "not-an-array" });
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const result = readQueue();
    stderrSpy.mockRestore();
    expect(result).toEqual([]);
  });

  it("recovers from a stale lock left behind by a dead pid", async () => {
    const { enqueue, readQueue } = await import("../src/lib/proposal-queue.ts");
    const dir = process.cwd();
    const lockPath = join(dir, ".proposal-queue.lock");
    // Stamp the lock with a pid that almost certainly does not exist on this host.
    writeFileSync(lockPath, "999999999", "utf8");
    // Backdate it past the stale-lock threshold (30s).
    const oldTime = (Date.now() - 60_000) / 1000;
    utimesSync(lockPath, oldTime, oldTime);
    enqueue(makeProposal({ id: "after-stale-lock" }));
    expect(readQueue()).toHaveLength(1);
    expect(existsSync(lockPath)).toBe(false);
  });
});
