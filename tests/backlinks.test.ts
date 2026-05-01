import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import { describe, expect, it, afterEach } from "vitest";
import { addClaimBacklink } from "../src/lib/backlinks.ts";

let tmpDir: string | null = null;

function setup(content: string): string {
  tmpDir = mkdtempSync(join(tmpdir(), "backlinks-test-"));
  const file = join(tmpDir, "thought.md");
  writeFileSync(file, content, "utf8");
  return file;
}

afterEach(() => {
  if (tmpDir) { rmSync(tmpDir, { recursive: true, force: true }); tmpDir = null; }
});

describe("addClaimBacklink", () => {
  it("adds claims array when frontmatter has none", async () => {
    const file = setup("---\ntitle: Test\n---\nbody\n");
    await addClaimBacklink(file, "my-claim");
    const parsed = matter(readFileSync(file, "utf8"));
    expect(parsed.data["claims"]).toEqual(["my-claim"]);
  });

  it("appends to existing claims array", async () => {
    const file = setup("---\ntitle: Test\nclaims:\n  - old-claim\n---\nbody\n");
    await addClaimBacklink(file, "new-claim");
    const parsed = matter(readFileSync(file, "utf8"));
    expect(parsed.data["claims"]).toEqual(["old-claim", "new-claim"]);
  });

  it("is idempotent when slug already present", async () => {
    const file = setup("---\ntitle: Test\nclaims:\n  - existing\n---\nbody\n");
    const before = readFileSync(file, "utf8");
    await addClaimBacklink(file, "existing");
    const after = readFileSync(file, "utf8");
    expect(after).toBe(before);
    const parsed = matter(after);
    expect(parsed.data["claims"]).toEqual(["existing"]);
  });

  it("preserves other frontmatter fields", async () => {
    const file = setup("---\ntitle: Preserved\ntags:\n  - foo\n---\nbody text\n");
    await addClaimBacklink(file, "new-claim");
    const parsed = matter(readFileSync(file, "utf8"));
    expect(parsed.data["title"]).toBe("Preserved");
    expect(parsed.data["tags"]).toEqual(["foo"]);
    expect(parsed.data["claims"]).toEqual(["new-claim"]);
  });
});
