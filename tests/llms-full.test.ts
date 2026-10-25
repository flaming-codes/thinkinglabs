import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vite-plus/test";
import { generateLlmsFullTxt } from "../src/lib/llms-full.ts";

describe("llms-full.txt generator", () => {
  it("generates markdown with the required header and core sections", () => {
    const text = generateLlmsFullTxt();
    expect(text.startsWith("# thinkinglabs — Full Knowledge Corpus")).toBe(true);
    expect(text).toContain("## Core Surfaces & Static Pages");
    expect(text).toContain("## Claims");
    expect(text).toContain("## Thoughts");
    expect(text).toContain("## Projects");
    expect(text).toContain("## Decisions");
  });

  it("includes markdown sibling urls and source paths", () => {
    const text = generateLlmsFullTxt();
    expect(text).toContain("(Markdown: /claims/");
    expect(text).toContain("Source**: content/");
    expect(text).toContain("Metadata**:");
  });

  it("produces non-empty content with substantial token budget", () => {
    const text = generateLlmsFullTxt();
    expect(text.length).toBeGreaterThan(10000);
    expect(text.split("\n").length).toBeGreaterThan(500);
  });

  it("dynamically derives content from the filesystem rather than static hardcoding", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "tl-test-corpus-"));
    try {
      const thoughtsDir = join(tempDir, "content", "thoughts");
      mkdirSync(thoughtsDir, { recursive: true });
      writeFileSync(
        join(thoughtsDir, "dynamic-test-thought.md"),
        `---
title: "Dynamic Thought For Test"
created: "2026-10-25"
updated: "2026-10-25"
tags: ["test-tag"]
related_claims: []
related_thoughts: []
---

This is unique dynamic content that only exists in the temporary test directory.
`,
        "utf8",
      );

      const generated = generateLlmsFullTxt(tempDir);
      expect(generated).toContain("### Dynamic Thought For Test");
      expect(generated).toContain("/thoughts/dynamic-test-thought");
      expect(generated).toContain(
        "This is unique dynamic content that only exists in the temporary test directory.",
      );
      expect(generated).toContain("content/thoughts/dynamic-test-thought.md");
      expect(generated).toContain("Tags: #test-tag");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
