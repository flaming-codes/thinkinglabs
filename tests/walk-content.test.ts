import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { walkMarkdown } from "../src/lib/walk-content.ts";

/** Creates a minimal markdown file at the given path. */
function writeMarkdown(path: string, fm: Record<string, unknown>, body: string): void {
  const fmLines = Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n");
  writeFileSync(path, `---\n${fmLines}\n---\n${body}`, "utf8");
}

describe("walkMarkdown", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "walk-content-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  /** Returns [] when the content/<kind> directory does not exist. */
  it("returns [] when directory does not exist", () => {
    expect(walkMarkdown({ cwd: tmpDir, kind: "posts" })).toEqual([]);
  });

  /** Returns [] when the directory exists but contains no .md files. */
  it("returns [] when directory has no .md files", () => {
    mkdirSync(join(tmpDir, "content", "posts"), { recursive: true });
    writeFileSync(join(tmpDir, "content", "posts", "readme.txt"), "not markdown", "utf8");
    expect(walkMarkdown({ cwd: tmpDir, kind: "posts" })).toEqual([]);
  });

  /** Returns one entry per markdown file with correct slug and data. */
  it("returns three entries for three valid files with correct slugs", () => {
    const dir = join(tmpDir, "content", "posts");
    mkdirSync(dir, { recursive: true });
    writeMarkdown(join(dir, "alpha.md"), { title: "Alpha" }, "body alpha");
    writeMarkdown(join(dir, "beta.md"), { title: "Beta" }, "body beta");
    writeMarkdown(join(dir, "gamma.md"), { title: "Gamma" }, "body gamma");

    const entries = walkMarkdown({ cwd: tmpDir, kind: "posts" });
    expect(entries).toHaveLength(3);
    const slugs = entries.map((e) => e.slug).sort();
    expect(slugs).toEqual(["alpha", "beta", "gamma"]);
  });

  /** Skips files starting with _seed. */
  it("skips files starting with _seed", () => {
    const dir = join(tmpDir, "content", "posts");
    mkdirSync(dir, { recursive: true });
    writeMarkdown(join(dir, "real.md"), { title: "Real" }, "body");
    writeMarkdown(join(dir, "_seed-fixture.md"), { title: "Seed" }, "seed body");

    const entries = walkMarkdown({ cwd: tmpDir, kind: "posts" });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.slug).toBe("real");
  });

  /** Skips hidden files starting with a dot. */
  it("skips hidden files starting with a dot", () => {
    const dir = join(tmpDir, "content", "posts");
    mkdirSync(dir, { recursive: true });
    writeMarkdown(join(dir, "visible.md"), { title: "Visible" }, "body");
    writeMarkdown(join(dir, ".hidden.md"), { title: "Hidden" }, "hidden body");

    const entries = walkMarkdown({ cwd: tmpDir, kind: "posts" });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.slug).toBe("visible");
  });

  /** Each entry includes path, data, and content fields. */
  it("returns correct path, data, and content fields", () => {
    const dir = join(tmpDir, "content", "thoughts");
    mkdirSync(dir, { recursive: true });
    writeMarkdown(join(dir, "my-thought.md"), { title: "My Thought", tags: ["a"] }, "the body text");

    const entries = walkMarkdown({ cwd: tmpDir, kind: "thoughts" });
    expect(entries).toHaveLength(1);
    const entry = entries[0]!;
    expect(entry.slug).toBe("my-thought");
    expect(entry.path).toBe(join(dir, "my-thought.md"));
    expect(entry.data["title"]).toBe("My Thought");
    expect(entry.content).toContain("the body text");
  });
});
