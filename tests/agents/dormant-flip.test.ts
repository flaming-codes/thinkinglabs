import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

/** Fixed "now" ISO used in all pure-function tests for determinism. */
const NOW_ISO = "2026-04-30T00:00:00.000Z";

/** Writes a minimal alive project frontmatter file into the temp tree. */
function writeProject(dir: string, slug: string, daysAgo: number, status = "alive"): void {
  const touchedAt = new Date(Date.parse(NOW_ISO) - daysAgo * 86_400_000);
  const file = join(dir, `${slug}.md`);
  writeFileSync(
    file,
    `---\ntitle: ${slug}\nstatus: ${status}\nstarted: 2026-01-01\ntags: []\nlinks: {}\nrelated_thoughts: []\nrelated_claims: []\n---\nBody.\n`,
    "utf8",
  );
  utimesSync(file, touchedAt, touchedAt);
}

/** Creates a temp tree with a projects dir; returns the root path. */
function makeTempTree(): string {
  const root = mkdtempSync(join(tmpdir(), "dormant-flip-test-"));
  mkdirSync(join(root, "content", "projects"), { recursive: true });
  return root;
}

describe("runDormantFlip — pure function", () => {
  let root = "";

  beforeEach(() => {
    root = makeTempTree();
    vi.spyOn(process, "cwd").mockReturnValue(root);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  it("emits one proposal for an alive project touched 100 days ago", async () => {
    const { runDormantFlip } = await import("../../src/lib/agents/dormant-flip.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeProject(join(root, "content", "projects"), "my-project", 100);
    const summary = runDormantFlip({ cwd: root, nowISO: NOW_ISO, thresholdDays: 60 });
    expect(summary.scanned).toBe(1);
    expect(summary.proposed).toBe(1);
    expect(summary.deduped).toBe(0);
    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0]?.type).toBe("project-flip-dormant");
  });

  it("dedupes on rerun — second call produces 0 new proposals", async () => {
    const { runDormantFlip } = await import("../../src/lib/agents/dormant-flip.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeProject(join(root, "content", "projects"), "stale-proj", 100);
    runDormantFlip({ cwd: root, nowISO: NOW_ISO, thresholdDays: 60 });
    const second = runDormantFlip({ cwd: root, nowISO: NOW_ISO, thresholdDays: 60 });
    expect(second.proposed).toBe(0);
    expect(second.deduped).toBe(1);
    expect(readQueue()).toHaveLength(1);
  });

  it("dedupes when only nowISO changes", async () => {
    const { runDormantFlip } = await import("../../src/lib/agents/dormant-flip.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeProject(join(root, "content", "projects"), "stale-proj", 100);
    runDormantFlip({ cwd: root, nowISO: "2026-04-30T00:00:00.000Z", thresholdDays: 60 });
    const second = runDormantFlip({
      cwd: root,
      nowISO: "2026-05-02T00:00:00.000Z",
      thresholdDays: 60,
    });
    expect(second.proposed).toBe(0);
    expect(second.deduped).toBe(1);
    expect(readQueue()).toHaveLength(1);
  });

  it("skips projects with status: dormant", async () => {
    const { runDormantFlip } = await import("../../src/lib/agents/dormant-flip.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeProject(join(root, "content", "projects"), "already-dormant", 100, "dormant");
    const summary = runDormantFlip({ cwd: root, nowISO: NOW_ISO, thresholdDays: 60 });
    expect(summary.scanned).toBe(0);
    expect(summary.proposed).toBe(0);
    expect(readQueue()).toHaveLength(0);
  });

  it("threshold 90: 100-day project proposes, 30-day project does not", async () => {
    const { runDormantFlip } = await import("../../src/lib/agents/dormant-flip.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeProject(join(root, "content", "projects"), "old", 100);
    writeProject(join(root, "content", "projects"), "fresh", 30);
    const summary = runDormantFlip({ cwd: root, nowISO: NOW_ISO, thresholdDays: 90 });
    expect(summary.scanned).toBe(2);
    expect(summary.proposed).toBe(1);
    expect(readQueue()).toHaveLength(1);
  });

  it("threshold 30: both 100-day and 30-day projects get proposals", async () => {
    const { runDormantFlip } = await import("../../src/lib/agents/dormant-flip.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeProject(join(root, "content", "projects"), "old", 100);
    writeProject(join(root, "content", "projects"), "recent", 31);
    const summary = runDormantFlip({ cwd: root, nowISO: NOW_ISO, thresholdDays: 30 });
    expect(summary.scanned).toBe(2);
    expect(summary.proposed).toBe(2);
    expect(readQueue()).toHaveLength(2);
  });

  it("scans 0 projects when projects dir is absent", async () => {
    const { runDormantFlip } = await import("../../src/lib/agents/dormant-flip.ts");
    const emptyRoot = mkdtempSync(join(tmpdir(), "dormant-flip-empty-"));
    vi.spyOn(process, "cwd").mockReturnValue(emptyRoot);
    try {
      const summary = runDormantFlip({ cwd: emptyRoot, nowISO: NOW_ISO, thresholdDays: 60 });
      expect(summary.scanned).toBe(0);
      expect(summary.proposed).toBe(0);
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  it("skips shipped and abandoned projects", async () => {
    const { runDormantFlip } = await import("../../src/lib/agents/dormant-flip.ts");
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    writeProject(join(root, "content", "projects"), "shipped-proj", 100, "shipped");
    writeProject(join(root, "content", "projects"), "abandoned-proj", 100, "abandoned");
    const summary = runDormantFlip({ cwd: root, nowISO: NOW_ISO, thresholdDays: 60 });
    expect(summary.scanned).toBe(0);
    expect(summary.proposed).toBe(0);
    expect(readQueue()).toHaveLength(0);
  });
});
