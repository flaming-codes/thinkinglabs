import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import matter from "gray-matter";
import type { z } from "zod";
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

/** Recursive depth-first markdown walk; mirrors `src/index/builder.ts:63`. Skips files starting with `_seed` or `.`. */
function walkMarkdownFiles(root: string): string[] {
  const out: string[] = [];
  if (!existsSync(root)) return out;
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!st.isFile()) continue;
      if (extname(name) !== ".md") continue;
      const base = basename(name);
      if (base.startsWith(".") || base.startsWith("_seed")) continue;
      out.push(full);
    }
  }
  return out.sort();
}

/** Slug = path under content/<kind>/ with `.md` stripped; nested dirs preserved as `/`. */
function deriveSlug(filePath: string, kindRoot: string): string {
  const rel = relative(kindRoot, filePath).replaceAll("\\", "/");
  return rel.endsWith(".md") ? rel.slice(0, -3) : rel;
}

/** Format a Zod issue list into a single-line summary. */
function summarizeIssues(issues: z.ZodIssue[]): string {
  return issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}

/** Read + parse a single markdown file into a typed entry; returns `{ ok, error }` rather than throwing. */
function readEntry<K extends Kind>(
  kind: K,
  kindRoot: string,
  filePath: string,
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
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch (e) {
    return {
      ok: false,
      error: { path: filePath, message: `${kind}/${slug}: frontmatter parse error: ${String(e)}` },
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
  const files = walkMarkdownFiles(kindRoot);
  const entries: TypedEntry<K>[] = [];
  for (const file of files) {
    const r = readEntry(kind, kindRoot, file);
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
  const files = walkMarkdownFiles(kindRoot);
  const entries: TypedEntry<K>[] = [];
  const errors: WalkError[] = [];
  for (const file of files) {
    const r = readEntry(kind, kindRoot, file);
    if (r.ok) entries.push(r.entry);
    else errors.push(r.error);
  }
  return { entries, errors };
}
