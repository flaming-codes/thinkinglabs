import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import Database from "better-sqlite3";
import { resolvedLastTouchedSyncBatch } from "../lib/git.ts";
import { formatFrontmatterParseError } from "../lib/frontmatter-errors.ts";
import { parseFrontmatterStrict } from "../lib/frontmatter-parse.ts";
import { walkMarkdownFiles } from "../lib/markdown-walk.ts";
import { stripKindPrefix, stripMdExt } from "../lib/refs.ts";
import { titleFor } from "../lib/registry.ts";
import { KIND_SCHEMAS, KINDS, type Kind } from "../schemas/index.ts";

/** Single object row produced from one source markdown file; used for ordered, deterministic inserts. */
export interface IndexedObject {
  id: string;
  kind: Kind;
  slug: string;
  frontmatter_json: string;
  body_md: string;
  last_touched: string;
  tags: ReadonlyArray<string>;
  links: ReadonlyArray<{ to_id: string; kind: string }>;
}

/** SQL schema kept verbatim in code so the index file format is reproducible from this repo alone. */
const SCHEMA_SQL = `
CREATE TABLE objects (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  slug TEXT NOT NULL,
  frontmatter_json TEXT NOT NULL,
  body_md TEXT NOT NULL,
  last_touched TEXT NOT NULL,
  UNIQUE(kind, slug)
);
CREATE INDEX objects_kind_idx ON objects(kind);

CREATE TABLE links (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  PRIMARY KEY(from_id, to_id, kind)
) WITHOUT ROWID;
CREATE INDEX links_to_kind_idx ON links(to_id, kind);

CREATE TABLE tags (
  object_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY(object_id, tag)
) WITHOUT ROWID;

CREATE VIRTUAL TABLE objects_fts USING fts5(
  id UNINDEXED,
  title,
  body,
  tags,
  tokenize = 'unicode61'
);

CREATE TABLE embeddings (
  object_id TEXT PRIMARY KEY,
  vector BLOB
);
`;

/** Slug = path under content/<kind>/ minus extension; nested directories preserved as `/` so collisions are explicit. */
function deriveSlug(filePath: string, kindRoot: string): string {
  const rel = relative(kindRoot, filePath).replaceAll("\\", "/");
  return stripMdExt(rel);
}

/** Canonical history with mtime fallback so seeds and uncommitted fixtures still index. */
function lastTouched(absPath: string, resolved: string | null | undefined): string {
  return resolved ?? new Date(statSync(absPath).mtimeMs).toISOString();
}

/** Edge `to_id` reduced to a bare slug; the edge `kind` already encodes the destination type so prefix is redundant. */
function normalizeLinkTarget(raw: string): string {
  return stripKindPrefix(stripMdExt(raw.replace(/^\/+/, "")).replace(/#.*$/, ""));
}

/** Read + validate a single file; throws with `<kind>/<slug>` and the Zod issue list on schema violations. */
function readObject(
  kind: Kind,
  kindRoot: string,
  file: string,
  repoRoot: string,
  lastTouchedISO: string | null | undefined,
): IndexedObject {
  const slug = deriveSlug(file, kindRoot);
  const raw = readFileSync(file, "utf8");
  let parsed: ReturnType<typeof parseFrontmatterStrict>;
  try {
    parsed = parseFrontmatterStrict(raw);
  } catch (error) {
    throw new Error(
      formatFrontmatterParseError({
        kind,
        slug,
        filePath: file,
        repoRoot,
        error,
      }),
    );
  }
  const spec = KIND_SCHEMAS[kind];
  const result = spec.schema.safeParse(parsed.data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Schema error in ${kind}/${slug} (${relative(repoRoot, file)}):\n${issues}`);
  }
  const data = result.data as Record<string, unknown>;
  const id = `${kind}/${slug}`;
  const tags = Array.isArray(data["tags"]) ? (data["tags"] as string[]) : [];
  const links: { to_id: string; kind: string }[] = [];
  for (const [field, edgeKind] of Object.entries(spec.linkFields)) {
    const value = data[field];
    if (!Array.isArray(value)) continue;
    for (const entry of value) {
      if (typeof entry !== "string" || entry.length === 0) continue;
      links.push({ to_id: normalizeLinkTarget(entry), kind: edgeKind });
    }
  }
  return {
    id,
    kind,
    slug,
    frontmatter_json: JSON.stringify(data),
    body_md: parsed.content,
    last_touched: lastTouched(file, lastTouchedISO),
    tags,
    links,
  };
}

/** Walks `content/`, validates everything, returns objects sorted by id so downstream inserts are deterministic. */
export function collectObjects(contentRoot: string, repoRoot: string): IndexedObject[] {
  const discovered: Array<{ kind: Kind; kindRoot: string; file: string }> = [];
  for (const kind of KINDS) {
    const kindRoot = join(contentRoot, kind);
    for (const file of walkMarkdownFiles(kindRoot)) {
      discovered.push({ kind, kindRoot, file });
    }
  }
  const lastTouchedByFile = resolvedLastTouchedSyncBatch(
    discovered.map((d) => d.file),
    repoRoot,
  );
  const out: IndexedObject[] = [];
  for (const { kind, kindRoot, file } of discovered) {
    out.push(readObject(kind, kindRoot, file, repoRoot, lastTouchedByFile.get(file)));
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Build the index in memory then serialize to disk so the output bytes only depend on insert order, not pager state. */
export function writeIndex(objects: ReadonlyArray<IndexedObject>, outFile: string): void {
  if (existsSync(outFile)) rmSync(outFile);
  const db = new Database(":memory:");
  db.pragma("journal_mode = MEMORY");
  db.pragma("synchronous = OFF");
  db.exec(SCHEMA_SQL);

  const insertObject = db.prepare(
    "INSERT INTO objects (id, kind, slug, frontmatter_json, body_md, last_touched) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertLink = db.prepare(
    "INSERT OR IGNORE INTO links (from_id, to_id, kind) VALUES (?, ?, ?)",
  );
  const insertTag = db.prepare("INSERT OR IGNORE INTO tags (object_id, tag) VALUES (?, ?)");
  const insertFts = db.prepare(
    "INSERT INTO objects_fts (id, title, body, tags) VALUES (?, ?, ?, ?)",
  );

  const tx = db.transaction((rows: ReadonlyArray<IndexedObject>) => {
    for (const o of rows) {
      insertObject.run(o.id, o.kind, o.slug, o.frontmatter_json, o.body_md, o.last_touched);
    }
    for (const o of rows) {
      const sortedLinks = [...o.links].sort((a, b) =>
        a.to_id === b.to_id ? (a.kind < b.kind ? -1 : 1) : a.to_id < b.to_id ? -1 : 1,
      );
      for (const l of sortedLinks) insertLink.run(o.id, l.to_id, l.kind);
    }
    for (const o of rows) {
      const sortedTags = [...new Set(o.tags)].sort();
      for (const t of sortedTags) insertTag.run(o.id, t);
    }
    for (const o of rows) {
      const fm = JSON.parse(o.frontmatter_json) as Record<string, unknown>;
      const titleSource = titleFor(o.kind, fm, "");
      insertFts.run(o.id, titleSource, o.body_md, o.tags.join(" "));
    }
  });
  tx(objects);

  db.exec(`VACUUM INTO '${outFile.replaceAll("'", "''")}'`);
  db.close();
}
