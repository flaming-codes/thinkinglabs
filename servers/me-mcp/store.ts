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
  inputs_recent: "inputs",
  questions: "questions",
  current_focus: "projects",
  claims_recent: "claims",
  claims_by_tag: "claims",
  projects_active: "projects",
  decisions_recent: "decisions",
  predictions_pending: "predictions",
  predictions_resolved: "predictions",
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

/** Read one public object by kind and slug; null when absent. */
export function getObject(repoRoot: string, kind: string, slug: string): ViewItem | null {
  assertObjectKind(kind);
  const root = resolveRepoRoot(repoRoot);
  const indexFile = join(root, "dist", "index.sqlite");
  if (existsSync(indexFile)) return queryObjectSqlite(indexFile, kind, slug);
  const object = collectObjects(join(root, "content"), root).find((o) => o.kind === kind && o.slug === slug);
  return object ? objectToItem(object) : null;
}

/** Return calibration data from resolved prediction objects. */
export function predictionCalibration(repoRoot: string): { resolved: number; buckets: Array<{ confidence: number; total: number; correct: number; accuracy: number | null }> } {
  const resolved = queryView(repoRoot, { view: "predictions_resolved", limit: 50 }).items;
  const buckets = new Map<number, { total: number; correct: number }>();
  for (const item of resolved) {
    const confidence = typeof item.frontmatter["confidence"] === "number" ? item.frontmatter["confidence"] : 0;
    const bucket = Math.round(confidence * 10) / 10;
    const current = buckets.get(bucket) ?? { total: 0, correct: 0 };
    current.total++;
    if (item.frontmatter["resolution"] === "true") current.correct++;
    buckets.set(bucket, current);
  }
  return {
    resolved: resolved.length,
    buckets: [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([confidence, b]) => ({
      confidence,
      total: b.total,
      correct: b.correct,
      accuracy: b.total === 0 ? null : b.correct / b.total,
    })),
  };
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return 10;
  return Math.min(Math.max(Math.trunc(limit), 1), 50);
}

function querySqlite(indexFile: string, args: QueryViewArgs, limit: number): ViewResult {
  const db = new Database(indexFile, { readonly: true, fileMustExist: true });
  try {
    if (args.view === "current_focus") {
      const rows = db
        .prepare("SELECT id, kind, slug, frontmatter_json, body_md, last_touched FROM objects WHERE kind IN ('projects', 'thoughts', 'questions') ORDER BY last_touched DESC, id ASC")
        .all() as ObjectRow[];
      return finalizeRows(args, "sqlite", rows.map(rowToItem), limit);
    }
    const rows = db
      .prepare("SELECT id, kind, slug, frontmatter_json, body_md, last_touched FROM objects WHERE kind = ? ORDER BY last_touched DESC, id ASC")
      .all(KIND_BY_VIEW[args.view]) as ObjectRow[];
    return finalizeRows(args, "sqlite", rows.map(rowToItem), limit);
  } finally {
    db.close();
  }
}

function querySource(repoRoot: string, args: QueryViewArgs, limit: number): ViewResult {
  const objects = collectObjects(join(repoRoot, "content"), repoRoot).filter((o) => args.view === "current_focus" ? ["projects", "thoughts", "questions"].includes(o.kind) : o.kind === KIND_BY_VIEW[args.view]);
  return finalizeRows(args, "source", objects.map(objectToItem), limit);
}

function queryObjectSqlite(indexFile: string, kind: string, slug: string): ViewItem | null {
  const db = new Database(indexFile, { readonly: true, fileMustExist: true });
  try {
    const row = db
      .prepare("SELECT id, kind, slug, frontmatter_json, body_md, last_touched FROM objects WHERE kind = ? AND slug = ? LIMIT 1")
      .get(kind, slug) as ObjectRow | undefined;
    return row ? rowToItem(row) : null;
  } finally {
    db.close();
  }
}

function finalizeRows(args: QueryViewArgs, source: "sqlite" | "source", rows: ViewItem[], limit: number): ViewResult {
  const query = args.query?.trim().toLowerCase();
  const tags = new Set((args.tags ?? []).map((t) => t.toLowerCase()));
  const filtered = rows.filter((item) => {
    if (args.view === "current_focus" && item.kind === "projects" && item.frontmatter["status"] !== "alive") return false;
    if (args.view === "current_focus" && item.kind === "questions" && !["open", "partial"].includes(String(item.frontmatter["status"] ?? ""))) return false;
    if (args.view === "projects_active" && item.frontmatter["status"] !== "alive") return false;
    if (args.view === "predictions_pending" && item.frontmatter["resolution"] !== "pending") return false;
    if (args.view === "predictions_resolved" && item.frontmatter["resolution"] === "pending") return false;
    if (query && !haystack(item).includes(query)) return false;
    if (tags.size > 0 && !item.tags.some((tag) => tags.has(tag.toLowerCase()))) return false;
    return true;
  });
  filtered.sort((a, b) => b.last_touched.localeCompare(a.last_touched) || a.id.localeCompare(b.id));
  const items = filtered.slice(0, limit);
  return { view: args.view, source, count: items.length, items };
}

function assertObjectKind(kind: string): void {
  if (kind === "thoughts" || kind === "claims" || kind === "projects" || kind === "decisions" || kind === "predictions" || kind === "inputs" || kind === "questions") return;
  throw new Error(`unsupported MCP resource kind: ${kind}`);
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
