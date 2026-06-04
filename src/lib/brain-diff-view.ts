import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { DiffDay, DiffEntry } from "../frontend/thinkinglabs-ui/types.ts";
import type { EntryType, FeedEntry } from "./brain-diff.ts";
import { nowISO } from "./clock.ts";
import { stripKindPrefix, stripMdExt } from "./refs.ts";

/** Shape of the generic brain-diff JSON artifact from `formatJson` in `brain-diff.ts`; fields are optional because the artifact is parsed from disk and treated as untrusted input. */
interface BrainDiffDocument {
  readonly kind?: string;
  readonly generated?: string;
  readonly entries?: ReadonlyArray<FeedEntry>;
}

/** Build-time path to the generated generic brain-diff artifact; an optional public file per `surfaces.ts`. */
const FEED_PATH = "public/feed/brain-diff.json";

/** Human-facing action verb for each `EntryType`; consumed by the brain-diff composition's mono column. */
const ACTION_BY_TYPE: Record<EntryType, string> = {
  "new-claim": "added",
  "claim-revised": "revised",
  "claim-deprecated": "deprecated",
  "decision-reversed": "reversed",
  "prediction-resolved": "resolved",
  "thought-substantively-updated": "updated",
  "project-status-changed": "status changed",
  "post-section-reverified": "reverified",
  other: "changed",
};

/** Singular display label for a content-kind path prefix; falls back to the raw prefix when unknown. */
const KIND_LABEL_BY_PREFIX: Record<string, string> = {
  claims: "claim",
  decisions: "decision",
  predictions: "prediction",
  thoughts: "thought",
  projects: "project",
  posts: "post",
  observations: "observation",
};

/** Title-cased month abbreviations indexed by zero-based month for the "Mon DD" day label. */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** UTC calendar-day key (YYYY-MM-DD) for an ISO timestamp; normalized to the UTC instant so it matches the UTC build clock used by relative labels (feed timestamps carry a local offset). */
function dayKey(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : iso.slice(0, 10);
}

/** Relative-or-absolute day label: "Today"/"Yesterday" against the build clock, else "Mon DD" (with year when not the current year). */
function dayLabel(key: string, nowKey: string, nowYear: string): string {
  if (key === nowKey) return "Today";
  const dayMs = Date.parse(`${key}T00:00:00Z`);
  const nowMs = Date.parse(`${nowKey}T00:00:00Z`);
  if (Number.isFinite(dayMs) && Number.isFinite(nowMs) && nowMs - dayMs === 86400000) {
    return "Yesterday";
  }
  const [year, month, day] = key.split("-");
  const monthIdx = month === undefined ? Number.NaN : Number.parseInt(month, 10) - 1;
  const monthName = MONTHS[monthIdx];
  if (year === undefined || day === undefined || monthName === undefined) return key;
  const base = `${monthName} ${Number.parseInt(day, 10)}`;
  return year === nowYear ? base : `${base}, ${year}`;
}

/** Kind label derived from the feed entry's `path` prefix (e.g. `content/claims/foo.md` -> "claim"). */
function kindFor(entry: FeedEntry): string {
  const withoutContent = entry.path.startsWith("content/")
    ? entry.path.slice("content/".length)
    : entry.path;
  const prefix = withoutContent.split("/", 1)[0] ?? "";
  return KIND_LABEL_BY_PREFIX[prefix] ?? prefix;
}

/** Display title for a feed entry: the slug stripped of its kind prefix and `.md` extension. */
function titleFor(entry: FeedEntry): string {
  return stripKindPrefix(stripMdExt(entry.title));
}

/** Map a single flat `FeedEntry` to the composition's `DiffEntry`; omits delta fields the feed does not carry. */
function toDiffEntry(entry: FeedEntry): DiffEntry {
  const base: DiffEntry = {
    kind: kindFor(entry),
    action: ACTION_BY_TYPE[entry.type],
    title: titleFor(entry),
  };
  return entry.summary === null ? base : { ...base, why: entry.summary };
}

/** Group a flat `FeedEntry[]` into the `DiffDay[]` view-model the composition expects; days are newest-first and entries within a day preserve the feed's chronological order. */
export function groupFeedEntriesByDay(
  entries: ReadonlyArray<FeedEntry>,
  now: string = nowISO(),
): DiffDay[] {
  const nowKey = dayKey(now);
  const nowYear = nowKey.slice(0, 4);
  const byDay = new Map<string, DiffEntry[]>();
  for (const entry of entries) {
    const key = dayKey(entry.isoDate);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(toDiffEntry(entry));
    else byDay.set(key, [toDiffEntry(entry)]);
  }
  return [...byDay.keys()]
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    .map((key) => ({ day: dayLabel(key, nowKey, nowYear), entries: byDay.get(key) ?? [] }));
}

/** Parse a previously-read artifact string into the typed document; throws on malformed JSON. */
function parseDocument(raw: string): BrainDiffDocument {
  return JSON.parse(raw) as BrainDiffDocument;
}

/** Format the artifact's `generated` ISO timestamp as a "YYYY-MM-DD HH:MM UTC" build label; null when absent or unparseable. */
export function buildLabel(generated: string | undefined): string | null {
  if (generated === undefined) return null;
  const ms = Date.parse(generated);
  if (!Number.isFinite(ms)) return null;
  const iso = new Date(ms).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** Result of loading the brain-diff artifact: the grouped day view-model plus a display build label (null when the artifact carries no `generated` field). */
export interface BrainDiffView {
  readonly days: DiffDay[];
  readonly build: string | null;
}

/** Load the generated brain-diff artifact and map it into the composition view-model; the artifact is optional (see `surfaces.ts`) so a missing or empty file yields an empty view, while other read or parse errors propagate. */
export function loadBrainDiff(cwd: string = process.cwd()): BrainDiffView {
  const file = resolve(cwd, FEED_PATH);
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { days: [], build: null };
    throw error;
  }
  if (raw.trim().length === 0) return { days: [], build: null };
  const doc = parseDocument(raw);
  return { days: groupFeedEntriesByDay(doc.entries ?? []), build: buildLabel(doc.generated) };
}
