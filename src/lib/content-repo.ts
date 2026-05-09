import { readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { z } from "zod";
import { formatFrontmatterParseError } from "./frontmatter-errors.ts";
import { parseFrontmatterStrict } from "./frontmatter-parse.ts";
import { walkMarkdownFiles } from "./markdown-walk.ts";
import { KIND_SCHEMAS, type Kind } from "../schemas/index.ts";

/** One typed entry returned by `loadContent`; `data` is the validated frontmatter, `body` is the markdown body. */
export interface TypedEntry<K extends Kind> {
  readonly slug: string;
  readonly data: z.infer<(typeof KIND_SCHEMAS)[K]["schema"]>;
  readonly body: string;
  readonly filePath: string;
}

/** One per-file walk error surfaced by `loadContentSafe`. */
export interface WalkError {
  readonly path: string;
  readonly message: string;
}

/** Slug = path under content/<kind>/ with `.md` stripped; nested dirs preserved as `/`. */
function deriveSlug(filePath: string, kindRoot: string): string {
  const rel = relative(kindRoot, filePath).replaceAll("\\", "/");
  return rel.endsWith(".md") ? rel.slice(0, -3) : rel;
}

/** Format a Zod issue list into a single-line summary. */
function summarizeIssues(issues: z.core.$ZodIssue[]): string {
  return issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}

/** Read + parse a single markdown file into a typed entry; returns `{ ok, error }` rather than throwing. */
function readEntry<K extends Kind>(
  kind: K,
  kindRoot: string,
  filePath: string,
  repoRoot: string,
): { ok: true; entry: TypedEntry<K> } | { ok: false; error: WalkError } {
  const slug = deriveSlug(filePath, kindRoot);
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (e) {
    return {
      ok: false,
      error: { path: filePath, message: `${kind}/${slug}: read error: ${String(e)}` },
    };
  }
  let parsed: ReturnType<typeof parseFrontmatterStrict>;
  try {
    parsed = parseFrontmatterStrict(raw);
  } catch (e) {
    return {
      ok: false,
      error: {
        path: filePath,
        message: formatFrontmatterParseError({
          kind,
          slug,
          filePath,
          repoRoot,
          error: e,
        }),
      },
    };
  }
  const spec = KIND_SCHEMAS[kind];
  const result = spec.schema.safeParse(parsed.data);
  if (!result.success) {
    return {
      ok: false,
      error: {
        path: filePath,
        message: `${kind}/${slug}: ${summarizeIssues(result.error.issues)}`,
      },
    };
  }
  const data = result.data as z.infer<(typeof KIND_SCHEMAS)[K]["schema"]>;
  return {
    ok: true,
    entry: { slug, data, body: parsed.content, filePath },
  };
}

/** Recursively load and validate every `content/<kind>/**\/*.md`; throws on the first failure (use `loadContentSafe` to collect). */
export function loadContent<K extends Kind>(kind: K, opts?: { cwd?: string }): TypedEntry<K>[] {
  const cwd = resolve(opts?.cwd ?? process.cwd());
  const kindRoot = join(cwd, "content", kind);
  const files = walkMarkdownFiles(kindRoot, { includeDotfiles: false, includeSeedFiles: false });
  const entries: TypedEntry<K>[] = [];
  for (const file of files) {
    const r = readEntry(kind, kindRoot, file, cwd);
    if (!r.ok) throw new Error(r.error.message);
    entries.push(r.entry);
  }
  return entries;
}

/** Like {@link loadContent} but returns errors instead of throwing; lets callers surface every bad file at once. */
export function loadContentSafe<K extends Kind>(
  kind: K,
  opts?: { cwd?: string },
): { entries: TypedEntry<K>[]; errors: WalkError[] } {
  const cwd = resolve(opts?.cwd ?? process.cwd());
  const kindRoot = join(cwd, "content", kind);
  const files = walkMarkdownFiles(kindRoot, { includeDotfiles: false, includeSeedFiles: false });
  const entries: TypedEntry<K>[] = [];
  const errors: WalkError[] = [];
  for (const file of files) {
    const r = readEntry(kind, kindRoot, file, cwd);
    if (r.ok) entries.push(r.entry);
    else errors.push(r.error);
  }
  return { entries, errors };
}
