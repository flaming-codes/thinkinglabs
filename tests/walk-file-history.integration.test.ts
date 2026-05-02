import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { walkFileHistory } from "../src/lib/git.ts";

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

function git(cwd: string, args: ReadonlyArray<string>): void {
  execFileSync("git", args as string[], {
    cwd,
    stdio: "ignore",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@t",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@t",
    },
  });
}

describe("walkFileHistory (integration)", () => {
  it("returns entries oldest-first with correct sha, date, and content", () => {
    const root = mkdtempSync(join(tmpdir(), "walk-fh-"));
    try {
      git(root, ["init", "-q", "-b", "main"]);
      mkdirSync(join(root, "content/claims"), { recursive: true });
      const filePath = join(root, "content/claims/test.md");
      const relPath = "content/claims/test.md";

      writeFileSync(filePath, `---\nclaim: V1\nconfidence: 0.5\n---\n`);
      git(root, ["add", "."]);
      git(root, ["commit", "-q", "-m", "v1"]);

      writeFileSync(filePath, `---\nclaim: V2\nconfidence: 0.65\n---\n`);
      git(root, ["add", "."]);
      git(root, ["commit", "-q", "-m", "v2"]);

      writeFileSync(filePath, `---\nclaim: V3\nconfidence: 0.8\n---\n`);
      git(root, ["add", "."]);
      git(root, ["commit", "-q", "-m", "v3"]);

      const entries = walkFileHistory(root, relPath);
      expect(entries).toHaveLength(3);

      // oldest-first ordering
      expect(entries[0]!.content).toContain("V1");
      expect(entries[1]!.content).toContain("V2");
      expect(entries[2]!.content).toContain("V3");

      // shas are non-empty 40-char hex strings
      for (const e of entries) {
        expect(e.sha).toMatch(/^[0-9a-f]{40}$/);
        expect(e.isoDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }

      // shas are distinct
      const shas = entries.map((e) => e.sha);
      expect(new Set(shas).size).toBe(3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);

  it("returns an empty array for a file with no git history", () => {
    const root = mkdtempSync(join(tmpdir(), "walk-fh-empty-"));
    try {
      git(root, ["init", "-q", "-b", "main"]);
      const entries = walkFileHistory(root, "content/claims/nonexistent.md");
      expect(entries).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);

  it("populates subject from the commit message subject line", () => {
    const root = mkdtempSync(join(tmpdir(), "walk-fh-subject-"));
    try {
      git(root, ["init", "-q", "-b", "main"]);
      mkdirSync(join(root, "content/claims"), { recursive: true });
      const filePath = join(root, "content/claims/subject-test.md");
      const relPath = "content/claims/subject-test.md";
      writeFileSync(filePath, `---\nclaim: V1\n---\n`);
      git(root, ["add", "."]);
      git(root, ["commit", "-q", "-m", "feat: add subject-test claim"]);
      const entries = walkFileHistory(root, relPath);
      expect(entries).toHaveLength(1);
      expect(entries[0]!.subject).toBe("feat: add subject-test claim");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);
});
