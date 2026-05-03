import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";
import { collectObjects, type IndexedObject } from "../../src/index/builder.ts";
import { calibration, type Bucket } from "../../src/lib/calibration.ts";
import { contactSchema, type Contact } from "../../src/schemas/contact.ts";
import type { Prediction } from "../../src/schemas/prediction.ts";
import {
  DETAIL_KINDS,
  titleFor,
  type FrontmatterPredicate,
  type PublicViewSpec,
} from "../../src/lib/registry.ts";
import { KINDS, type Kind } from "../../src/schemas/index.ts";
import {
  MCP_PUBLIC_VIEWS,
  type QueryViewArgs,
  type PublicView,
  type ViewItem,
  type ViewResult,
} from "./types.ts";

/** Derived `view -> spec` lookup; widened to `PublicViewSpec` so optional fields (`kinds`, `predicates`) are visible to callers. */
const VIEW_SPEC: Record<PublicView, PublicViewSpec> = Object.fromEntries(
  MCP_PUBLIC_VIEWS.map((v) => [v.view, v as PublicViewSpec]),
) as Record<PublicView, PublicViewSpec>;

/** Set of kinds a view requests when reading the index (defaults to `[v.kind]`). */
function viewKinds(view: PublicView): ReadonlyArray<Kind> {
  return VIEW_SPEC[view].kinds ?? [VIEW_SPEC[view].kind];
}

/** Per-kind predicate set declared in the registry (e.g. `current_focus.projects = status==='alive'`). */
function viewPredicates(view: PublicView): Readonly<Partial<Record<Kind, FrontmatterPredicate>>> {
  return VIEW_SPEC[view].predicates ?? {};
}

/** Apply a view's per-kind predicates to a single item; items whose kind has no predicate pass through. */
function passesViewPredicate(view: PublicView, item: ViewItem): boolean {
  const pred = viewPredicates(view)[asKind(item.kind)];
  return pred ? pred(item.frontmatter) : true;
}

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
  const object = collectObjects(join(root, "content"), root).find(
    (o) => o.kind === kind && o.slug === slug,
  );
  return object ? objectToItem(object) : null;
}

/** MCP-shaped calibration response: resolved count plus per-bucket counts and rates. */
export interface PredictionCalibrationResult {
  readonly resolved: number;
  readonly buckets: ReadonlyArray<{
    readonly confidence: number;
    readonly total: number;
    readonly correct: number;
    readonly accuracy: number | null;
  }>;
}

/** Pure adapter from the shared `calibration()` output to the MCP response envelope. */
export function calibrationToMcpEnvelope(
  predictions: ReadonlyArray<Pick<Prediction, "confidence" | "resolution">>,
): PredictionCalibrationResult {
  const buckets = calibration(predictions);
  return {
    resolved: predictions.length,
    buckets: buckets.map((b: Bucket) => ({
      confidence: Math.round(b.mid * 10) / 10,
      total: b.total,
      correct: b.correct,
      accuracy: b.accuracy,
    })),
  };
}

/** Extract the typed prediction subset the shared calibration helper expects. */
function viewItemToPrediction(
  item: ViewItem,
): Pick<Prediction, "confidence" | "resolution"> | null {
  const confidence = item.frontmatter["confidence"];
  const resolution = item.frontmatter["resolution"];
  if (typeof confidence !== "number") return null;
  if (resolution !== "true" && resolution !== "false" && resolution !== "ambiguous") return null;
  return { confidence, resolution };
}

/** Return calibration data from ALL resolved prediction objects via the shared helper. */
export function predictionCalibration(repoRoot: string): PredictionCalibrationResult {
  const root = resolveRepoRoot(repoRoot);
  const indexFile = join(root, "dist", "index.sqlite");
  const items = existsSync(indexFile)
    ? readResolvedPredictionsSqlite(indexFile)
    : readResolvedPredictionsSource(root);
  const predictions: Array<Pick<Prediction, "confidence" | "resolution">> = [];
  for (const item of items) {
    const p = viewItemToPrediction(item);
    if (p !== null) predictions.push(p);
  }
  return calibrationToMcpEnvelope(predictions);
}

function readResolvedPredictionsSqlite(indexFile: string): ViewItem[] {
  const db = new Database(indexFile, { readonly: true, fileMustExist: true });
  try {
    const rows = db
      .prepare(
        "SELECT id, kind, slug, frontmatter_json, body_md, last_touched FROM objects WHERE kind = 'predictions'",
      )
      .all() as ObjectRow[];
    return rows.map(rowToItem).filter((i) => i.frontmatter["resolution"] !== "pending");
  } finally {
    db.close();
  }
}

function readResolvedPredictionsSource(repoRoot: string): ViewItem[] {
  return collectObjects(join(repoRoot, "content"), repoRoot)
    .filter((o) => o.kind === "predictions")
    .map(objectToItem)
    .filter((i) => i.frontmatter["resolution"] !== "pending");
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return 10;
  return Math.min(Math.max(Math.trunc(limit), 1), 50);
}

function querySqlite(indexFile: string, args: QueryViewArgs, limit: number): ViewResult {
  const db = new Database(indexFile, { readonly: true, fileMustExist: true });
  try {
    const kinds = viewKinds(args.view);
    const placeholders = kinds.map(() => "?").join(", ");
    const rows = db
      .prepare(
        `SELECT id, kind, slug, frontmatter_json, body_md, last_touched FROM objects WHERE kind IN (${placeholders}) ORDER BY last_touched DESC, id ASC`,
      )
      .all(...kinds) as ObjectRow[];
    return finalizeRows(args, "sqlite", rows.map(rowToItem), limit);
  } finally {
    db.close();
  }
}

function querySource(repoRoot: string, args: QueryViewArgs, limit: number): ViewResult {
  const kinds = new Set<string>(viewKinds(args.view));
  const objects = collectObjects(join(repoRoot, "content"), repoRoot).filter((o) =>
    kinds.has(o.kind),
  );
  return finalizeRows(args, "source", objects.map(objectToItem), limit);
}

function queryObjectSqlite(indexFile: string, kind: string, slug: string): ViewItem | null {
  const db = new Database(indexFile, { readonly: true, fileMustExist: true });
  try {
    const row = db
      .prepare(
        "SELECT id, kind, slug, frontmatter_json, body_md, last_touched FROM objects WHERE kind = ? AND slug = ? LIMIT 1",
      )
      .get(kind, slug) as ObjectRow | undefined;
    return row ? rowToItem(row) : null;
  } finally {
    db.close();
  }
}

function finalizeRows(
  args: QueryViewArgs,
  source: "sqlite" | "source",
  rows: ViewItem[],
  limit: number,
): ViewResult {
  const query = args.query?.trim().toLowerCase();
  const tags = new Set((args.tags ?? []).map((t) => t.toLowerCase()));
  const filtered = rows.filter((item) => {
    if (!passesViewPredicate(args.view, item)) return false;
    if (query && !haystack(item).includes(query)) return false;
    if (tags.size > 0 && !item.tags.some((tag) => tags.has(tag.toLowerCase()))) return false;
    return true;
  });
  filtered.sort((a, b) => b.last_touched.localeCompare(a.last_touched) || a.id.localeCompare(b.id));
  const items = filtered.slice(0, limit);
  return { view: args.view, source, count: items.length, items };
}

/** Set of object kinds the MCP detail resource exposes; derived from the registry. */
const DETAIL_KIND_SET: ReadonlySet<string> = new Set(DETAIL_KINDS);

function assertObjectKind(kind: string): void {
  if (DETAIL_KIND_SET.has(kind)) return;
  throw new Error(`unsupported MCP resource kind: ${kind}`);
}

function rowToItem(row: ObjectRow): ViewItem {
  return makeItem(
    row.id,
    row.kind,
    row.slug,
    JSON.parse(row.frontmatter_json) as Record<string, unknown>,
    row.body_md,
    row.last_touched,
  );
}

function objectToItem(object: IndexedObject): ViewItem {
  return makeItem(
    object.id,
    object.kind,
    object.slug,
    JSON.parse(object.frontmatter_json) as Record<string, unknown>,
    object.body_md,
    object.last_touched,
  );
}

function makeItem(
  id: string,
  kind: string,
  slug: string,
  frontmatter: Record<string, unknown>,
  body: string,
  lastTouched: string,
): ViewItem {
  const tags = Array.isArray(frontmatter["tags"])
    ? frontmatter["tags"].filter((t): t is string => typeof t === "string")
    : [];
  return {
    id,
    kind,
    slug,
    title: titleFor(asKind(kind), frontmatter, slug),
    url: `/${kind}/${slug}`,
    summary: summarize(body),
    frontmatter,
    body_md: body,
    last_touched: lastTouched,
    tags,
  };
}

/** Narrow a string `kind` from sqlite/source rows to the `Kind` literal union; falls back to "thoughts" on unknown values. */
function asKind(kind: string): Kind {
  return (KINDS as ReadonlyArray<string>).includes(kind) ? (kind as Kind) : "thoughts";
}

function summarize(body: string): string {
  const paragraph =
    body
      .split(/\n\s*\n/)
      .find((p) => p.trim().length > 0)
      ?.replace(/\s+/g, " ")
      .trim() ?? "";
  return paragraph.length > 240 ? `${paragraph.slice(0, 237)}...` : paragraph;
}

function haystack(item: ViewItem): string {
  return [
    item.id,
    item.title,
    item.summary,
    item.body_md,
    JSON.stringify(item.frontmatter),
    item.tags.join(" "),
  ]
    .join("\n")
    .toLowerCase();
}
