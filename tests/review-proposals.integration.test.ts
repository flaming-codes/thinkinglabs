import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { writeJsonState } from "../src/lib/json-state.ts";
import type { QueuedProposal } from "../src/lib/proposal-queue.ts";

/** Resolves whether `git` is callable. */
function gitAvailable(): boolean {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Absolute path to the CLI script. */
const SCRIPT = join(process.cwd(), "scripts", "review-proposals.ts");

describe("review-proposals CLI (integration)", () => {
  it("exits 0 with '0 proposals' when queue is empty", () => {
    const root = mkdtempSync(join(tmpdir(), "review-proposals-int-"));
    try {
      const result = spawnSync("tsx", [SCRIPT], { cwd: root, encoding: "utf8", timeout: 30_000 });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("0 proposals");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  it("exits 2 on unknown --filter value", () => {
    const root = mkdtempSync(join(tmpdir(), "review-proposals-int-"));
    try {
      const result = spawnSync("tsx", [SCRIPT, "--filter", "not-a-source"], {
        cwd: root,
        encoding: "utf8",
        timeout: 30_000,
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("unknown source");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  describe.runIf(gitAvailable())("--dry-run preserves queue", () => {
    it("queue file is unchanged after --dry-run with a registered-handler proposal", () => {
      const root = mkdtempSync(join(tmpdir(), "review-proposals-int-"));
      try {
        const proposal: QueuedProposal = {
          id: "persist-me",
          source: "dormant-flip",
          type: "project-flip-dormant",
          createdAt: "2026-01-01T00:00:00.000Z",
          target: "content/projects/some-project.md",
          title: "Flip some-project dormant",
          preview: "Inactive for 60 days.",
          payload: { daysSinceTouched: 60, thresholdDays: 60, lastTouchedISO: null },
        };
        writeJsonState(join(root, ".proposal-queue.json"), { proposals: [proposal] });
        spawnSync("tsx", [SCRIPT, "--dry-run"], { cwd: root, encoding: "utf8", timeout: 30_000 });
        /** Queue file must still exist and still contain the proposal since --dry-run removes nothing. */
        expect(existsSync(join(root, ".proposal-queue.json"))).toBe(true);
        const contents = JSON.parse(readFileSync(join(root, ".proposal-queue.json"), "utf8")) as {
          proposals: unknown[];
        };
        expect(contents.proposals).toHaveLength(1);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }, 30_000);
  });
});
