import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import { describe, expect, it, afterEach } from "vitest";
import { patchFrontmatter } from "../src/lib/frontmatter.ts";
import { claimSchema } from "../src/schemas/claim.ts";

let tmpDir: string | null = null;

/** Create a temp markdown file and return its path. */
function setup(content: string): string {
  tmpDir = mkdtempSync(join(tmpdir(), "frontmatter-test-"));
  const file = join(tmpDir, "file.md");
  writeFileSync(file, content, "utf8");
  return file;
}

afterEach(() => {
  if (tmpDir) { rmSync(tmpDir, { recursive: true, force: true }); tmpDir = null; }
});

describe("patchFrontmatter", () => {
  it("bumps a single field", async () => {
    const file = setup("---\ntitle: Test\nlast_reviewed: \"2026-01-01\"\n---\nbody\n");
    await patchFrontmatter(file, (data) => { data["last_reviewed"] = "2026-04-30"; });
    const parsed = matter(readFileSync(file, "utf8"));
    expect(parsed.data["last_reviewed"]).toBe("2026-04-30");
    expect(parsed.data["title"]).toBe("Test");
  });

  it("replaces the whole object when mutate returns a value", async () => {
    const file = setup("---\ntitle: Old\nfoo: bar\n---\nbody\n");
    await patchFrontmatter(file, () => ({ title: "New" }));
    const parsed = matter(readFileSync(file, "utf8"));
    expect(parsed.data["title"]).toBe("New");
    expect(parsed.data["foo"]).toBeUndefined();
  });

  it("is idempotent on a no-op mutator", async () => {
    const file = setup("---\ntitle: Stable\n---\nbody\n");
    const before = readFileSync(file, "utf8");
    await patchFrontmatter(file, () => {});
    expect(readFileSync(file, "utf8")).toBe(before);
  });

  it("round-trips through claimSchema.parse after a last_reviewed bump", async () => {
    const initial = [
      "---",
      "claim: \"AI will change journalism.\"",
      "confidence: 0.7",
      "evidence: []",
      "opposing: []",
      "derived_from: []",
      "last_reviewed: \"2026-01-01\"",
      "status: \"active\"",
      "supersedes: []",
      "superseded_by: []",
      "tags: []",
      "---",
      "",
    ].join("\n");
    const file = setup(initial);
    await patchFrontmatter(file, (data) => { data["last_reviewed"] = "2026-04-30"; });
    const { data } = matter(readFileSync(file, "utf8"));
    const validated = claimSchema.parse(data);
    expect(validated.last_reviewed).toBe("2026-04-30");
    expect(validated.claim).toBe("AI will change journalism.");
  });

  it("preserves body content across patches", async () => {
    const file = setup("---\ntitle: Test\n---\nHello world.\n");
    await patchFrontmatter(file, (data) => { data["title"] = "Updated"; });
    const parsed = matter(readFileSync(file, "utf8"));
    expect(parsed.content.trim()).toBe("Hello world.");
  });
});
