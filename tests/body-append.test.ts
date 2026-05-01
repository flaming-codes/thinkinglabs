import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendSection } from "../src/lib/body-append.ts";

describe("appendSection", () => {
  let dir = "";
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "body-append-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it("appends a heading and body section to an existing file", () => {
    const file = join(dir, "test.md");
    writeFileSync(file, `---\ntitle: Test\n---\n\nExisting content.\n`);
    appendSection(file, "New Answer (2026-04-30)", "This is the answer.");
    const { content } = matter(readFileSync(file, "utf8"));
    expect(content).toContain("## New Answer (2026-04-30)");
    expect(content).toContain("This is the answer.");
    expect(content).toContain("Existing content.");
  });

  it("preserves the frontmatter after append", () => {
    const file = join(dir, "fm.md");
    writeFileSync(file, `---\ntitle: MyDoc\nstatus: open\n---\n\nBody.\n`);
    appendSection(file, "Section", "Content.");
    const { data } = matter(readFileSync(file, "utf8"));
    expect(data["title"]).toBe("MyDoc");
    expect(data["status"]).toBe("open");
  });

  it("works on a file with an empty body", () => {
    const file = join(dir, "empty.md");
    writeFileSync(file, `---\ntitle: Empty\n---\n`);
    appendSection(file, "First Section", "First content.");
    const { content } = matter(readFileSync(file, "utf8"));
    expect(content).toContain("## First Section");
    expect(content).toContain("First content.");
  });
});
