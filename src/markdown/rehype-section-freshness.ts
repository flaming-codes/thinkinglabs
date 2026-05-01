import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import { freshnessNowISO, freshnessState } from "../lib/freshness.ts";

/** Heading tag names hast emits for `# … ######`. */
const HEADINGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/** Builds the inline `<span class="freshness-pill">` element appended to a stamped heading. */
function pill(verifiedISO: string, nowISO: string): Element {
  const { state, daysAgo } = freshnessState(verifiedISO, nowISO);
  const label = `verified ${verifiedISO} · ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`;
  return {
    type: "element",
    tagName: "span",
    properties: { className: ["freshness-pill"], "data-state": state },
    children: [{ type: "text", value: label }],
  };
}

/** Appends a freshness pill to any heading whose `data-last-verified` came from the remark plugin; no-op otherwise. */
export default function rehypeSectionFreshness() {
  const nowISO = freshnessNowISO();
  return (tree: Root): void => {
    visit(tree, "element", (node: Element) => {
      if (!HEADINGS.has(node.tagName)) return;
      const verified = node.properties?.["data-last-verified"];
      if (typeof verified !== "string" || verified.length === 0) return;
      node.children.push({ type: "text", value: " " }, pill(verified, nowISO));
    });
  };
}
