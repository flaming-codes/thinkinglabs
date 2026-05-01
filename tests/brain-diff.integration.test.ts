import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { walkCommits, classify } from "../src/lib/brain-diff.ts";

/** Resolves whether `git` is callable; the integration test skips silently otherwise. */
function gitAvailable(): boolean {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function git(cwd: string, args: ReadonlyArray<string>): void {
  execFileSync("git", args as string[], { cwd, stdio: "ignore", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } });
}

describe.runIf(gitAvailable())("brain-diff walker (integration)", () => {
  it("walks a synthetic repo and classifies each commit", () => {
    const root = mkdtempSync(join(tmpdir(), "brain-diff-"));
    try {
      git(root, ["init", "-q", "-b", "main"]);
      mkdirSync(join(root, "content/claims"), { recursive: true });
      mkdirSync(join(root, "content/predictions"), { recursive: true });

      writeFileSync(
        join(root, "content/claims/a.md"),
        `---\nclaim: A\nconfidence: 0.5\nstatus: active\n---\nbody\n`,
      );
      git(root, ["add", "."]);
      git(root, ["commit", "-q", "-m", "add claim a"]);

      writeFileSync(
        join(root, "content/claims/a.md"),
        `---\nclaim: A\nconfidence: 0.7\nstatus: active\n---\nbody\n`,
      );
      git(root, ["add", "."]);
      git(root, ["commit", "-q", "-m", "revise confidence"]);

      writeFileSync(
        join(root, "content/predictions/p.md"),
        `---\nprediction: P\nmade: 2026-01-01\nresolves: 2026-12-31\nconfidence: 0.5\nresolution: pending\n---\nbody\n`,
      );
      git(root, ["add", "."]);
      git(root, ["commit", "-q", "-m", "add prediction"]);

      writeFileSync(
        join(root, "content/predictions/p.md"),
        `---\nprediction: P\nmade: 2026-01-01\nresolves: 2026-12-31\nconfidence: 0.5\nresolution: true\nresolved_on: 2026-04-15\n---\nbody\n`,
      );
      git(root, ["add", "."]);
      git(root, ["commit", "-q", "-m", "resolve prediction"]);

      const commits = walkCommits({ since: "2000-01-01", cwd: root });
      expect(commits).toHaveLength(4);
      const types = commits.map((c) => classify(c.files[0]!));
      expect(types).toEqual(["new-claim", "claim-revised", "other", "prediction-resolved"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);
});
