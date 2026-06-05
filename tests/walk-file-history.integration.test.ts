import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import {
  lastTouchedSync,
  lastTouchedSyncBatch,
  resolvedLastTouchedSync,
  resolvedLastTouchedSyncBatch,
  walkFileHistory,
} from "../src/lib/git.ts";

/** Asserts `git` is on PATH at module load; fail loudly rather than silently skipping coverage. */
function assertGitAvailable(): void {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error(
      "git is required for this integration test but was not found on PATH. " +
        "Install git or run in an environment that ships it.",
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

  it("reconstructs exact byte content per revision, matching git show", () => {
    const root = mkdtempSync(join(tmpdir(), "walk-fh-content-"));
    try {
      git(root, ["init", "-q", "-b", "main"]);
      mkdirSync(join(root, "content/claims"), { recursive: true });
      const filePath = join(root, "content/claims/content.md");
      const relPath = "content/claims/content.md";
      const bodies = [
        `---\nclaim: V1\nconfidence: 0.5\n---\nFirst body.\n`,
        `---\nclaim: V2\nconfidence: 0.65\nevidence: [a, b]\n---\nSecond body\nwith two lines.\n`,
        `---\nclaim: V3\nconfidence: 0.8\n---\nThird body with trailing spaces   \n`,
      ];
      for (let i = 0; i < bodies.length; i++) {
        writeFileSync(filePath, bodies[i]!);
        git(root, ["add", "."]);
        git(root, ["commit", "-q", "-m", `v${i + 1}`]);
      }

      const entries = walkFileHistory(root, relPath);
      expect(entries).toHaveLength(3);
      for (const e of entries) {
        const viaShow = execFileSync("git", ["show", `${e.sha}:${relPath}`], {
          cwd: root,
          encoding: "utf8",
        });
        expect(e.content).toBe(viaShow);
      }
      expect(entries[0]!.content).toBe(bodies[0]);
      expect(entries[2]!.content).toBe(bodies[2]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);

  it("handles a tracked path containing spaces", () => {
    const root = mkdtempSync(join(tmpdir(), "walk-fh-space-"));
    try {
      git(root, ["init", "-q", "-b", "main"]);
      mkdirSync(join(root, "content/claims"), { recursive: true });
      const relPath = "content/claims/with space.md";
      writeFileSync(join(root, relPath), `---\nclaim: spaced\nconfidence: 0.4\n---\nBody.\n`);
      git(root, ["add", "."]);
      git(root, ["commit", "-q", "-m", "spaced claim"]);
      const entries = walkFileHistory(root, relPath);
      expect(entries).toHaveLength(1);
      expect(entries[0]!.content).toContain("spaced");
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

describe("lastTouchedSyncBatch / resolvedLastTouchedSyncBatch (integration)", () => {
  it("returns the same per-path dates as the per-file sync variants", () => {
    const root = mkdtempSync(join(tmpdir(), "batch-lt-"));
    try {
      git(root, ["init", "-q", "-b", "main"]);
      mkdirSync(join(root, "content/claims"), { recursive: true });
      mkdirSync(join(root, "content/thoughts"), { recursive: true });
      const tracked = [
        "content/claims/one.md",
        "content/claims/two.md",
        "content/thoughts/three.md",
        "content/claims/with space.md",
      ];
      for (const rel of tracked) {
        writeFileSync(join(root, rel), `---\nclaim: ${rel}\nconfidence: 0.5\n---\nBody.\n`);
        git(root, ["add", "."]);
        git(root, ["commit", "-q", "-m", `add ${rel}`]);
      }
      writeFileSync(
        join(root, "content/claims/one.md"),
        `---\nclaim: one v2\nconfidence: 0.6\n---\n`,
      );
      git(root, ["add", "."]);
      git(root, ["commit", "-q", "-m", "revise one"]);

      const untracked = join(root, "content/claims/untracked.md");
      writeFileSync(untracked, `---\nclaim: untracked\n---\n`);

      const absPaths = [...tracked.map((rel) => join(root, rel)), untracked];

      const gitBatch = lastTouchedSyncBatch(absPaths, root);
      const resolvedBatch = resolvedLastTouchedSyncBatch(absPaths, root);
      for (const abs of absPaths) {
        expect(gitBatch.get(abs)).toBe(lastTouchedSync(abs, root));
        expect(resolvedBatch.get(abs)).toBe(resolvedLastTouchedSync(abs, root));
      }
      expect(gitBatch.get(untracked)).toBeNull();
      expect(resolvedBatch.get(untracked)).not.toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 20_000);

  it("resolves non-ASCII filenames (git core.quotePath disabled)", () => {
    const root = mkdtempSync(join(tmpdir(), "batch-lt-utf8-"));
    try {
      git(root, ["init", "-q", "-b", "main"]);
      mkdirSync(join(root, "content/claims"), { recursive: true });
      writeFileSync(
        join(root, "content/claims/café-señor.md"),
        `---\nclaim: accented\nconfidence: 0.5\n---\nBody.\n`,
      );
      git(root, ["add", "."]);
      git(root, ["commit", "-q", "-m", "add accented claim"]);
      // Read the on-disk name so the lookup key matches the filesystem's unicode normalization (NFC vs NFD).
      const name = readdirSync(join(root, "content/claims")).find((n) => n.endsWith(".md"))!;
      const abs = join(root, "content/claims", name);
      const gitBatch = lastTouchedSyncBatch([abs], root);
      // Without core.quotePath=false git would emit an octal-escaped quoted path that misses this key.
      expect(gitBatch.get(abs)).not.toBeNull();
      expect(gitBatch.get(abs)).toBe(lastTouchedSync(abs, root));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 20_000);

  it("returns an empty map for empty input without spawning git", () => {
    expect(lastTouchedSyncBatch([], "/nonexistent").size).toBe(0);
    expect(resolvedLastTouchedSyncBatch([], "/nonexistent").size).toBe(0);
  });

  it("falls back to null git dates outside a work tree", () => {
    const root = mkdtempSync(join(tmpdir(), "batch-lt-nogit-"));
    try {
      mkdirSync(join(root, "content/claims"), { recursive: true });
      const abs = join(root, "content/claims/loose.md");
      writeFileSync(abs, `---\nclaim: loose\n---\n`);
      expect(lastTouchedSyncBatch([abs], root).get(abs)).toBeNull();
      expect(resolvedLastTouchedSyncBatch([abs], root).get(abs)).not.toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);
});
