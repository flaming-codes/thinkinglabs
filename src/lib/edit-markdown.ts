import { readFileSync, writeFileSync } from "node:fs";
import matter from "gray-matter";
import { editInEditor } from "./editor.ts";
import { KIND_SCHEMAS, type Kind } from "../schemas/index.ts";

/** Result of {@link editMarkdownWithSchema}. */
export type EditResult = { ok: true } | { ok: false; reason: string };

/** Open `$EDITOR` on `filePath` and validate the saved frontmatter; rolls back on schema failure. */
export async function editMarkdownWithSchema<K extends Kind>(
  kind: K,
  filePath: string,
): Promise<EditResult> {
  const before = readFileSync(filePath, "utf8");
  let edited: string;
  try {
    edited = await editInEditor(before, ".md");
  } catch (e) {
    return { ok: false, reason: `editor failed: ${String(e)}` };
  }
  writeFileSync(filePath, edited, "utf8");

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(edited);
  } catch (e) {
    writeFileSync(filePath, before, "utf8");
    return { ok: false, reason: `frontmatter parse error: ${String(e)}` };
  }
  const result = KIND_SCHEMAS[kind].schema.safeParse(parsed.data);
  if (!result.success) {
    writeFileSync(filePath, before, "utf8");
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return { ok: false, reason: `${kind} schema validation failed: ${issues}` };
  }
  return { ok: true };
}
