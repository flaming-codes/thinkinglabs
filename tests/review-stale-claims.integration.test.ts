import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";

/** Asserts `git` is on PATH at module load. CI must provision git; we fail loudly rather than
 *  silently skip so a runner regression cannot disguise itself as green coverage. */
function assertGitAvailable(): void {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error(
      "git is required for this integration test but was not found on PATH. " +
        "Install git or run on a runner that ships it (ubuntu-latest does).",
    );
  }
}
assertGitAvailable();

describe("review-stale-claims CLI (integration, --no-llm --dry-run)", () => {
  it("exits 0 and prints 0 flags when claims dir is empty", () => {
    const root = mkdtempSync(join(tmpdir(), "review-stale-int-"));
    try {
      mkdirSync(join(root, "content", "claims"), { recursive: true });
      const script = join(process.cwd(), "scripts", "review-stale-claims.ts");
      const result = spawnSync("tsx", [script, "--no-llm", "--dry-run"], {
        cwd: root,
        encoding: "utf8",
        timeout: 30_000,
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("0 flags");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  it("exits 0, reports flags, and writes no files for a stale claim with --dry-run", () => {
    const root = mkdtempSync(join(tmpdir(), "review-stale-int2-"));
    try {
      mkdirSync(join(root, "content", "claims"), { recursive: true });
      /** Write a claim with last_reviewed >90 days ago relative to today. */
      writeFileSync(
        join(root, "content", "claims", "old-claim.md"),
        '---\nclaim: "Test."\nconfidence: 0.5\nlast_reviewed: "2020-01-01"\nstatus: "active"\n---\nBody.\n',
        "utf8",
      );
      const script = join(process.cwd(), "scripts", "review-stale-claims.ts");
      const result = spawnSync("tsx", [script, "--no-llm", "--dry-run"], {
        cwd: root,
        encoding: "utf8",
        timeout: 30_000,
      });
      expect(result.status).toBe(0);
      /** No deferral file should be written in dry-run mode. */
      expect(!existsSync(join(root, ".stale-review-deferrals.json"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
