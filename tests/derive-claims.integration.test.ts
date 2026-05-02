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

describe("derive-claims CLI (integration, --no-llm --dry-run)", () => {
  it("exits 0 and writes no files when thoughts dir is empty", () => {
    const root = mkdtempSync(join(tmpdir(), "derive-claims-int-"));
    try {
      mkdirSync(join(root, "content", "thoughts"), { recursive: true });
      mkdirSync(join(root, "content", "claims"), { recursive: true });

      const script = join(process.cwd(), "scripts", "derive-claims.ts");
      const result = spawnSync("tsx", [script, "--no-llm", "--dry-run", "--all"], {
        cwd: root,
        encoding: "utf8",
        timeout: 30_000,
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("0 accepted");
      expect(result.stdout).toContain("0 rejected");
      expect(!existsSync(join(root, ".derivation-state.json"))).toBe(true);
      expect(!existsSync(join(root, ".derivation-rejections.json"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  it("exits 0 and reports proposals for a thought file when --no-llm", () => {
    const root = mkdtempSync(join(tmpdir(), "derive-claims-int2-"));
    try {
      mkdirSync(join(root, "content", "thoughts"), { recursive: true });
      mkdirSync(join(root, "content", "claims"), { recursive: true });
      writeFileSync(
        join(root, "content", "thoughts", "test-thought.md"),
        "---\ntitle: Test\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\nSome prose.\n",
        "utf8",
      );

      const script = join(process.cwd(), "scripts", "derive-claims.ts");
      const result = spawnSync("tsx", [script, "--no-llm", "--dry-run", "--all"], {
        cwd: root,
        encoding: "utf8",
        timeout: 30_000,
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("0 proposals");
      expect(!existsSync(join(root, ".derivation-state.json"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
