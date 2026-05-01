import { readFileSync, writeFileSync } from "node:fs";
import matter from "gray-matter";

/** Read, mutate, and write the frontmatter of a markdown file in-place; idempotent on no-op mutators. */
export async function patchFrontmatter(
  filePath: string,
  mutate: (data: Record<string, unknown>) => Record<string, unknown> | void,
): Promise<void> {
  const raw = readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const before = JSON.stringify(parsed.data);
  const returned = mutate(parsed.data);
  const next = returned !== undefined ? returned : parsed.data;
  if (JSON.stringify(next) === before) return;
  writeFileSync(filePath, matter.stringify(parsed.content, next), "utf8");
}
