import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { loadContent, loadContentSafe } from "../src/lib/content-repo.ts";

/** Writes a minimal post markdown file with valid frontmatter. */
function writePost(
  path: string,
  fm: { title: string; created: string; updated: string },
  body: string,
): void {
  const lines = [
    "---",
    `title: ${JSON.stringify(fm.title)}`,
    `created: "${fm.created}"`,
    `updated: "${fm.updated}"`,
    "---",
    body,
  ];
  writeFileSync(path, lines.join("\n"), "utf8");
}

describe("loadContent", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "content-repo-test-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  /** Returns [] when content/<kind> does not exist. */
  it("returns [] when directory does not exist", () => {
    expect(loadContent("posts", { cwd: tmp })).toEqual([]);
  });

  /** Returns [] when directory has no .md files. */
  it("returns [] when directory has no markdown", () => {
    mkdirSync(join(tmp, "content", "posts"), { recursive: true });
    writeFileSync(join(tmp, "content", "posts", "readme.txt"), "not markdown", "utf8");
    expect(loadContent("posts", { cwd: tmp })).toEqual([]);
  });

  /** Walks recursively into nested subdirectories. */
  it("walks nested directories", () => {
    const dir = join(tmp, "content", "posts", "2026", "q1");
    mkdirSync(dir, { recursive: true });
    writePost(
      join(dir, "nested.md"),
      { title: "Nested", created: "2026-01-01", updated: "2026-01-02" },
      "body",
    );
    const entries = loadContent("posts", { cwd: tmp });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.slug).toBe("2026/q1/nested");
  });

  /** Skips files starting with `_seed` or `.`. */
  it("skips _seed and dotfiles", () => {
    const dir = join(tmp, "content", "posts");
    mkdirSync(dir, { recursive: true });
    writePost(
      join(dir, "real.md"),
      { title: "Real", created: "2026-01-01", updated: "2026-01-02" },
      "body",
    );
    writePost(
      join(dir, "_seed-fixture.md"),
      { title: "Seed", created: "2026-01-01", updated: "2026-01-02" },
      "seed",
    );
    writePost(
      join(dir, ".hidden.md"),
      { title: "Hidden", created: "2026-01-01", updated: "2026-01-02" },
      "hidden",
    );
    const entries = loadContent("posts", { cwd: tmp });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.slug).toBe("real");
  });

  /** Throws on invalid frontmatter rather than silently dropping the file. */
  it("throws on schema-invalid frontmatter", () => {
    const dir = join(tmp, "content", "posts");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "broken.md"), "---\ntitle: Missing dates\n---\nbody", "utf8");
    expect(() => loadContent("posts", { cwd: tmp })).toThrow(/posts\/broken/);
  });

  /** Returns parsed body and validated frontmatter for a typed entry. */
  it("returns typed entry with body and frontmatter", () => {
    const dir = join(tmp, "content", "posts");
    mkdirSync(dir, { recursive: true });
    writePost(
      join(dir, "alpha.md"),
      { title: "Alpha", created: "2026-01-01", updated: "2026-01-02" },
      "the body text",
    );
    const entries = loadContent("posts", { cwd: tmp });
    expect(entries).toHaveLength(1);
    const e = entries[0]!;
    expect(e.slug).toBe("alpha");
    expect(e.data.title).toBe("Alpha");
    expect(e.body).toContain("the body text");
    expect(e.filePath.endsWith("alpha.md")).toBe(true);
  });
});

describe("loadContentSafe", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "content-repo-test-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  /** Collects per-file errors instead of throwing. */
  it("collects errors for invalid files and returns valid ones", () => {
    const dir = join(tmp, "content", "posts");
    mkdirSync(dir, { recursive: true });
    writePost(
      join(dir, "ok.md"),
      { title: "OK", created: "2026-01-01", updated: "2026-01-02" },
      "body",
    );
    writeFileSync(join(dir, "bad.md"), "---\ntitle: only-title\n---\nbody", "utf8");
    const { entries, errors } = loadContentSafe("posts", { cwd: tmp });
    expect(entries.map((e) => e.slug)).toEqual(["ok"]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain("posts/bad");
  });
});
