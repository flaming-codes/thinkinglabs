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
});
