import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkSectionFreshness from "../markdown/remark-section-freshness.ts";
import type { Heading, Root } from "mdast";
import { visit } from "unist-util-visit";

type HeadingDataWithProperties = NonNullable<Heading["data"]> & {
  hProperties?: Record<string, string>;
};

const ATTR_RE = /\s*\{[^{}]*\}\s*$/;

/** Recursively concatenate plain text from an mdast node and its inline children. */
function extractHeadingText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const candidate = node as { value?: unknown; children?: unknown[] };
  if (typeof candidate.value === "string") return candidate.value;
  if (Array.isArray(candidate.children)) {
    return candidate.children.map((child) => extractHeadingText(child)).join("");
  }
  return "";
}

/** One stamped heading extracted from a post body. */
export interface SectionStamp {
  readonly headingText: string;
  readonly anchor: string;
  readonly lastVerifiedISO: string;
}

/** Parse all `{#anchor last_verified="..."}` stamps from a markdown body without Astro's pipeline. */
export function parseSectionStamps(markdown: string): Array<SectionStamp> {
  const processor = unified().use(remarkParse).use(remarkSectionFreshness);
  const tree = processor.parse(markdown) as Root;
  processor.runSync(tree);

  const stamps: SectionStamp[] = [];
  visit(tree, "heading", (node: Heading) => {
    const hp = (node.data as HeadingDataWithProperties | undefined)?.hProperties;
    const verified = hp?.["data-last-verified"];
    if (!verified) return;
    const id = hp?.["id"];
    const headingText = extractHeadingText(node).replace(ATTR_RE, "").trim();
    stamps.push({ headingText, anchor: id ?? headingText, lastVerifiedISO: verified });
  });
  return stamps;
}
