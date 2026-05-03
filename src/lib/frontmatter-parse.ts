import matter from "gray-matter";

const FRONTMATTER_BLOCK_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const FRONTMATTER_PREFIX_RE = /^---(?:\r?\n|$)/;
type MatterWithYamlEngine = typeof matter & {
  engines?: {
    yaml?: {
      parse?: (src: string) => unknown;
    };
  };
};
const MATTER_WITH_YAML_ENGINE = matter as MatterWithYamlEngine;

/** Parse markdown frontmatter and fail if YAML is malformed or frontmatter delimiters are unterminated. */
export function parseFrontmatterStrict(raw: string): matter.GrayMatterFile<string> {
  const block = FRONTMATTER_BLOCK_RE.exec(raw);
  if (block) {
    const yaml = block[1];
    if (yaml !== undefined) MATTER_WITH_YAML_ENGINE.engines?.yaml?.parse?.(yaml);
    return matter(raw);
  }
  if (FRONTMATTER_PREFIX_RE.test(raw)) {
    throw new Error("missing closing '---' frontmatter delimiter");
  }
  return matter(raw);
}
