import { describe, expect, it } from "vite-plus/test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import type { Heading, Root, Text } from "mdast";
import remarkSectionFreshness from "../src/markdown/remark-section-freshness.ts";

type HeadingDataWithProperties = NonNullable<Heading["data"]> & {
  hProperties?: Record<string, string>;
};

/** Parse + run the freshness remark plugin and return the first heading node so tests can assert on it. */
function firstHeading(md: string): Heading {
  const tree = unified().use(remarkParse).use(remarkSectionFreshness).parse(md) as Root;
  unified().use(remarkSectionFreshness).runSync(tree);
  return tree.children.find((c): c is Heading => c.type === "heading")!;
}

function headingText(h: Heading): string {
  return h.children.map((c) => (c.type === "text" ? (c as Text).value : "")).join("");
}

function hProperties(h: Heading): Record<string, string> | undefined {
  return (h.data as HeadingDataWithProperties | undefined)?.hProperties;
}

describe("remark-section-freshness", () => {
  it("extracts id and last_verified into hProperties", () => {
    const h = firstHeading(`## Sizing the harness {#sizing last_verified="2026-04-15"}\n`);
    expect(hProperties(h)).toEqual({ id: "sizing", "data-last-verified": "2026-04-15" });
    expect(headingText(h).trim()).toBe("Sizing the harness");
  });

  it("is a no-op on plain headings", () => {
    const h = firstHeading(`## Plain heading\n`);
    expect(hProperties(h)).toBeUndefined();
    expect(headingText(h)).toBe("Plain heading");
  });

  it("handles a bare id shortcut", () => {
    const h = firstHeading(`### Just an id {#anchor}\n`);
    expect(hProperties(h)).toEqual({ id: "anchor" });
    expect(headingText(h).trim()).toBe("Just an id");
  });

  it("is idempotent on text already stripped", () => {
    const h = firstHeading(`## Already clean\n`);
    expect(headingText(h)).toBe("Already clean");
    expect(hProperties(h)).toBeUndefined();
  });

  it("ignores malformed attribute blocks (no key=value pairs)", () => {
    const h = firstHeading(`## Title {garbage}\n`);
    expect(hProperties(h) ?? {}).toEqual({});
    expect(headingText(h).trim()).toBe("Title");
  });

  it("supports multiple key=value attrs (generic)", () => {
    const h = firstHeading(`## H {#x foo="bar" baz="qux"}\n`);
    expect(hProperties(h)).toEqual({
      id: "x",
      "data-foo": "bar",
      "data-baz": "qux",
    });
  });
});
