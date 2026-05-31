import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkSectionFreshness from "../markdown/remark-section-freshness.ts";
import type { Heading, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

type HeadingDataWithProperties = NonNullable<Heading["data"]> & {
  hProperties?: Record<string, string>;
};

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
    const textNode = node.children.find((c) => c.type === "text") as Text | undefined;
    const headingText = textNode?.value.trim() ?? "";
    stamps.push({ headingText, anchor: id ?? headingText, lastVerifiedISO: verified });
  });
  return stamps;
}
