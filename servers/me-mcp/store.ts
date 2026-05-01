import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";
import { collectObjects, type IndexedObject } from "../../src/index/builder.ts";
import { contactSchema, type Contact } from "../../src/schemas/contact.ts";
import type { QueryViewArgs, PublicView, ViewItem, ViewResult } from "./types.ts";

const KIND_BY_VIEW = {
  thoughts: "thoughts",
  claims: "claims",
  projects: "projects",
  decisions: "decisions",
  predictions: "predictions",
  inputs: "inputs",
  current_focus: "projects",
} as const satisfies Record<PublicView, string>;

interface ObjectRow {
  readonly id: string;
  readonly kind: string;
  readonly slug: string;
  readonly frontmatter_json: string;
  readonly body_md: string;
  readonly last_touched: string;
}

/** Resolve user-provided cwd/repoRoot to a stable absolute repo path. */
export function resolveRepoRoot(repoRoot = process.cwd()): string {
  return resolve(repoRoot);
}

/** Load the public contact contract from this repo root. */
export function loadContact(repoRoot = process.cwd()): Contact {
  const file = join(resolveRepoRoot(repoRoot), "public", "contact.json");
  const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
  return contactSchema.parse(raw);
}

/** Read one public view from SQLite when available, otherwise from content source. */
export function queryView(repoRoot: string, args: QueryViewArgs): ViewResult {
  const root = resolveRepoRoot(repoRoot);
  const indexFile = join(root, "dist", "index.sqlite");
  const limit = clampLimit(args.limit);
  if (existsSync(indexFile)) return querySqlite(indexFile, args, limit);
  return querySource(root, args, limit);
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return 10;
  return Math.min(Math.max(Math.trunc(limit), 1), 50);
}

function querySqlite(indexFile: string, args: QueryViewArgs, limit: number): ViewResult {
  const db = new Database(indexFile, { readonly: true, fileMustExist: true });
  try {
    const rows = db
      .prepare("SELECT id, kind, slug, frontmatter_json, body_md, last_touched FROM objects WHERE kind = ? ORDER BY last_touched DESC, id ASC")
      .all(KIND_BY_VIEW[args.view]) as ObjectRow[];
    return finalizeRows(args, "sqlite", rows.map(rowToItem), limit);
  } finally {
    db.close();
  }
}

function querySource(repoRoot: string, args: QueryViewArgs, limit: number): ViewResult {
  const objects = collectObjects(join(repoRoot, "content"), repoRoot).filter((o) => o.kind === KIND_BY_VIEW[args.view]);
  return finalizeRows(args, "source", objects.map(objectToItem), limit);
}

function finalizeRows(args: QueryViewArgs, source: "sqlite" | "source", rows: ViewItem[], limit: number): ViewResult {
  const query = args.query?.trim().toLowerCase();
  const tags = new Set((args.tags ?? []).map((t) => t.toLowerCase()));
  const filtered = rows.filter((item) => {
    if (args.view === "current_focus" && item.frontmatter["status"] !== "alive") return false;
    if (query && !haystack(item).includes(query)) return false;
    if (tags.size > 0 && !item.tags.some((tag) => tags.has(tag.toLowerCase()))) return false;
    return true;
  });
  filtered.sort((a, b) => b.last_touched.localeCompare(a.last_touched) || a.id.localeCompare(b.id));
  const items = filtered.slice(0, limit);
  return { view: args.view, source, count: items.length, items };
}

function rowToItem(row: ObjectRow): ViewItem {
  return makeItem(row.id, row.kind, row.slug, JSON.parse(row.frontmatter_json) as Record<string, unknown>, row.body_md, row.last_touched);
}

function objectToItem(object: IndexedObject): ViewItem {
  return makeItem(object.id, object.kind, object.slug, JSON.parse(object.frontmatter_json) as Record<string, unknown>, object.body_md, object.last_touched);
}

function makeItem(id: string, kind: string, slug: string, frontmatter: Record<string, unknown>, body: string, lastTouched: string): ViewItem {
  const tags = Array.isArray(frontmatter["tags"]) ? frontmatter["tags"].filter((t): t is string => typeof t === "string") : [];
  return {
    id,
    kind,
    slug,
    title: titleFor(frontmatter, slug),
    url: `/${kind}/${slug}`,
    summary: summarize(body),
    frontmatter,
    body_md: body,
    last_touched: lastTouched,
    tags,
  };
}

function titleFor(frontmatter: Record<string, unknown>, fallback: string): string {
  for (const key of ["title", "claim", "decision", "prediction"]) {
    const value = frontmatter[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return fallback;
}

function summarize(body: string): string {
  const paragraph = body.split(/\n\s*\n/).find((p) => p.trim().length > 0)?.replace(/\s+/g, " ").trim() ?? "";
  return paragraph.length > 240 ? `${paragraph.slice(0, 237)}...` : paragraph;
}

function haystack(item: ViewItem): string {
  return [item.id, item.title, item.summary, item.body_md, item.tags.join(" ")].join("\n").toLowerCase();
}
