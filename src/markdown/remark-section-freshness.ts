import type { Heading, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

/** Pandoc-style trailing attribute block on a heading: `## Title {#id key="value"}`. */
const ATTR_RE = /\s*\{([^{}]*)\}\s*$/;

/** One `key="value"` pair inside the brace; tolerates straight + curly quotes (smartypants rewrites `"` to `“”` upstream). */
const PAIR_RE =
  /(?:#([A-Za-z0-9_-]+)|([a-zA-Z][\w-]*)\s*=\s*["“]([^"”]*)["”]|([a-zA-Z][\w-]*)\s*=\s*['‘]([^'’]*)['’])/g;

/** Returns parsed attrs and the cleaned trailing-text remainder; null when no `{...}` block is present. */
function parseAttrs(text: string): { attrs: Record<string, string>; head: string } | null {
  const m = ATTR_RE.exec(text);
  if (!m) return null;
  const inner = m[1] ?? "";
  const attrs: Record<string, string> = {};
  let pair: RegExpExecArray | null;
  PAIR_RE.lastIndex = 0;
  while ((pair = PAIR_RE.exec(inner)) !== null) {
    if (pair[1]) attrs["id"] = pair[1];
    else if (pair[2]) attrs[pair[2]] = pair[3] ?? "";
    else if (pair[4]) attrs[pair[4]] = pair[5] ?? "";
  }
  return { attrs, head: text.slice(0, m.index) };
}

/** Converts attr keys to hProperties form: `id` stays `id`, others become `data-<kebab>`; values pass through verbatim. */
function toHProperties(attrs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "id") out["id"] = v;
    else out[`data-${k.replaceAll("_", "-")}`] = v;
  }
  return out;
}

/** Lifts Pandoc-style `{...}` heading attrs into hProperties so rehype plugins can act on them; idempotent on plain headings. */
export default function remarkSectionFreshness() {
  return (tree: Root): void => {
    visit(tree, "heading", (node: Heading) => {
      const last = node.children[node.children.length - 1];
      if (!last || last.type !== "text") return;
      const tnode = last as Text;
      const parsed = parseAttrs(tnode.value);
      if (!parsed) return;
      tnode.value = parsed.head;
      const data = (node.data ??= {});
      const hp = (data.hProperties ??= {}) as Record<string, string>;
      Object.assign(hp, toHProperties(parsed.attrs));
    });
  };
}
