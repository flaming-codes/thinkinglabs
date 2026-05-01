import matter from "gray-matter";
import { nowISO } from "./clock.ts";
import { git, showAt } from "./git.ts";
import { stripMdExt } from "./refs.ts";

/** Stable string-literal union; producers and consumers share this set so a new type cannot drift across files. */
export type EntryType =
  | "new-claim"
  | "claim-revised"
  | "claim-deprecated"
  | "decision-reversed"
  | "prediction-resolved"
  | "thought-substantively-updated"
  | "project-status-changed"
  | "post-section-reverified"
  | "other";

/** Per-file change inside a commit; frontmatter is parsed once at walk time so classify() and the LLM share the same view. */
export interface FileDiff {
  readonly path: string;
  readonly status: "A" | "M" | "D";
  readonly oldFrontmatter?: Record<string, unknown>;
  readonly newFrontmatter?: Record<string, unknown>;
  readonly oldBody?: string;
  readonly newBody?: string;
}

/** One commit's worth of tracked-file changes; non-tracked files are filtered upstream so consumers never see them. */
export interface CommitDiff {
  readonly sha: string;
  readonly isoDate: string;
  readonly subject: string;
  readonly files: ReadonlyArray<FileDiff>;
}

/** Final feed entry shape; `score`/`summary` are null when LLM scoring is skipped. */
export interface FeedEntry {
  readonly sha: string;
  readonly isoDate: string;
  readonly path: string;
  readonly type: EntryType;
  readonly title: string;
  readonly score: number | null;
  readonly summary: string | null;
}

/** Tracked path prefixes; ordering matches the kind names so classify() can pattern-match cheaply. */
const TRACKED_PREFIXES = [
  "claims/",
  "decisions/",
  "predictions/",
  "thoughts/",
  "projects/",
  "posts/",
] as const;

/** True iff `path` is one of the tracked content kinds; pure so the walker, classifier, and predicates share it. */
export function isTrackedPath(path: string): boolean {
  return (
    TRACKED_PREFIXES.some((p) => path.startsWith(`content/${p}`)) ||
    TRACKED_PREFIXES.some((p) => path.startsWith(p))
  );
}

/** Strips a leading `content/` so callers can match on `claims/foo.md` regardless of repo layout. */
function tracked(path: string): string {
  return path.startsWith("content/") ? path.slice("content/".length) : path;
}

/** Reads any field that may have changed between old/new frontmatter; null when both are absent. */
function fmChanged(
  o: Record<string, unknown> | undefined,
  n: Record<string, unknown> | undefined,
  key: string,
): boolean {
  return JSON.stringify(o?.[key]) !== JSON.stringify(n?.[key]);
}

/** Pure pattern-match dispatch from path + frontmatter shape to an EntryType; classify() never reads git. */
export function classify(file: FileDiff): EntryType {
  const p = tracked(file.path);
  if (p.startsWith("claims/")) {
    if (file.status === "A") return "new-claim";
    if (file.status === "M") {
      if (
        file.newFrontmatter?.["status"] === "deprecated" &&
        file.oldFrontmatter?.["status"] !== "deprecated"
      ) {
        return "claim-deprecated";
      }
      return "claim-revised";
    }
  }
  if (p.startsWith("decisions/")) {
    if (file.status === "A") {
      const reverses = file.newFrontmatter?.["reverses"];
      if (Array.isArray(reverses) && reverses.length > 0) return "decision-reversed";
    }
    if (
      file.status === "M" &&
      file.newFrontmatter?.["status"] === "reversed" &&
      file.oldFrontmatter?.["status"] !== "reversed"
    ) {
      return "decision-reversed";
    }
  }
  if (p.startsWith("predictions/") && file.status === "M") {
    if (
      fmChanged(file.oldFrontmatter, file.newFrontmatter, "resolution") &&
      file.newFrontmatter?.["resolution"] !== "pending"
    ) {
      return "prediction-resolved";
    }
  }
  if (p.startsWith("thoughts/") && file.status === "M") return "thought-substantively-updated";
  if (
    p.startsWith("projects/") &&
    file.status === "M" &&
    fmChanged(file.oldFrontmatter, file.newFrontmatter, "status")
  ) {
    return "project-status-changed";
  }
  if (p.startsWith("posts/") && file.status === "M") return "post-section-reverified";
  return "other";
}

/** Splits a `<sha> <iso> <subject>` line; subject may contain spaces so we re-join the tail. */
function parseLogLine(line: string): { sha: string; isoDate: string; subject: string } | null {
  const m = /^([0-9a-f]+)\t([^\t]+)\t(.*)$/.exec(line);
  return m ? { sha: m[1]!, isoDate: m[2]!, subject: m[3]! } : null;
}

/** Parses a name-status line, ignoring rename details (treats R as M for our purposes). */
function parseNameStatus(line: string): { status: "A" | "M" | "D"; path: string } | null {
  const parts = line.split("\t");
  if (parts.length < 2) return null;
  const code = parts[0]!.charAt(0);
  const path = parts[parts.length - 1]!;
  if (code === "A") return { status: "A", path };
  if (code === "D") return { status: "D", path };
  if (code === "M" || code === "R" || code === "C" || code === "T") return { status: "M", path };
  return null;
}

/** Parse markdown frontmatter, returning {} on parse failures so classify() never blows up on malformed YAML at the edge. */
function parseFm(raw: string | null): { fm: Record<string, unknown>; body: string } {
  if (raw === null) return { fm: {}, body: "" };
  try {
    const parsed = matter(raw);
    return { fm: parsed.data as Record<string, unknown>, body: parsed.content };
  } catch {
    return { fm: {}, body: raw };
  }
}

/** True iff `s` looks like a git ref-like expression (HEAD, sha, or HEAD~N) rather than a date. */
function isRefLike(s: string): boolean {
  return /^(HEAD(\^+|~\d*)?|[0-9a-f]{4,40})$/.test(s);
}

/** Walks commits since `since` (a ref or date), yielding only tracked-content changes. */
export function walkCommits({
  since,
  cwd = process.cwd(),
}: {
  since: string;
  cwd?: string;
}): CommitDiff[] {
  const args = isRefLike(since) ? [`${since}..HEAD`] : [`--since=${since}`];
  const log = git(
    ["log", ...args, "--pretty=format:%H\t%cI\t%s", "--name-status", "--reverse"],
    cwd,
  );
  const lines = log.split("\n");
  const out: CommitDiff[] = [];
  let current: { sha: string; isoDate: string; subject: string; files: FileDiff[] } | null = null;
  for (const line of lines) {
    if (line.length === 0) continue;
    const head = parseLogLine(line);
    if (head) {
      if (current) out.push(current);
      current = { ...head, files: [] };
      continue;
    }
    if (!current) continue;
    const ns = parseNameStatus(line);
    if (!ns || !isTrackedPath(ns.path)) continue;
    const oldRaw = ns.status === "A" ? null : showAt(cwd, `${current.sha}^`, ns.path);
    const newRaw = ns.status === "D" ? null : showAt(cwd, current.sha, ns.path);
    const { fm: oldFm, body: oldBody } = parseFm(oldRaw);
    const { fm: newFm, body: newBody } = parseFm(newRaw);
    current.files.push({
      path: ns.path,
      status: ns.status,
      ...(oldRaw !== null ? { oldFrontmatter: oldFm, oldBody } : {}),
      ...(newRaw !== null ? { newFrontmatter: newFm, newBody } : {}),
    });
  }
  if (current) out.push(current);
  return out.filter((c) => c.files.length > 0);
}

/** XML-escape; only the five characters that matter inside element text. */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Title an entry from its path; the renderer picks `<kind>/<slug>` so atom and json titles agree. */
function titleFor(file: FileDiff): string {
  return stripMdExt(tracked(file.path));
}

/** Assemble the user-visible title from path + commit; consumed by both formatters. */
export function buildEntries(
  commits: ReadonlyArray<CommitDiff>,
  scored?: ReadonlyMap<string, { score: number; summary: string }>,
): FeedEntry[] {
  const out: FeedEntry[] = [];
  for (const c of commits) {
    for (const f of c.files) {
      const key = `${c.sha}:${f.path}`;
      const s = scored?.get(key);
      out.push({
        sha: c.sha,
        isoDate: c.isoDate,
        path: f.path,
        type: classify(f),
        title: titleFor(f),
        score: s?.score ?? null,
        summary: s?.summary ?? null,
      });
    }
  }
  return out;
}

/** Generic feed predicate-by-type; specialized JSONs share this shape so adding a feed is one entry. */
export const FEED_PREDICATES = {
  "predictions-resolved": (e: FeedEntry) => e.type === "prediction-resolved",
  "claims-revised": (e: FeedEntry) =>
    e.type === "claim-revised" || e.type === "new-claim" || e.type === "claim-deprecated",
  "decisions-reversed": (e: FeedEntry) => e.type === "decision-reversed",
} as const;

/** Score threshold below which entries are excluded from the *generic* brain-diff feed only. */
export const GENERIC_FEED_MIN_SCORE = 4;

/** Apply the generic feed's substantiveness gate; null scores pass through (no-LLM mode emits everything). */
export function applyGenericGate(entries: ReadonlyArray<FeedEntry>): FeedEntry[] {
  return entries.filter((e) => e.score === null || e.score >= GENERIC_FEED_MIN_SCORE);
}

/** Build a stable JSON document for any kind of feed; identical schema across generic + specialized feeds. */
export function formatJson(entries: ReadonlyArray<FeedEntry>, kind = "brain-diff"): string {
  return JSON.stringify({ kind, generated: buildNowISO(), entries }, null, 2);
}

/** Build an RFC 4287 atom feed; minimal but valid (id, title, updated; per-entry id/title/summary/link). */
export function formatAtom(
  entries: ReadonlyArray<FeedEntry>,
  opts: { siteUrl?: string } = {},
): string {
  const site = opts.siteUrl ?? "https://tom.wild.as";
  const updated = entries[0]?.isoDate ?? buildNowISO();
  const head = [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<feed xmlns="http://www.w3.org/2005/Atom">`,
    `  <id>${xmlEscape(`${site}/feed/brain-diff`)}</id>`,
    `  <title>Brain diff</title>`,
    `  <updated>${xmlEscape(updated)}</updated>`,
    `  <link href="${xmlEscape(`${site}/feed/brain-diff.xml`)}" rel="self"/>`,
  ];
  const body = entries.map((e) => {
    const url = `${site}/${e.title}`;
    const id = `${site}/feed/brain-diff/${e.sha}/${e.path}`;
    return [
      `  <entry>`,
      `    <id>${xmlEscape(id)}</id>`,
      `    <title>[${e.type}] ${xmlEscape(e.title)}</title>`,
      `    <updated>${xmlEscape(e.isoDate)}</updated>`,
      `    <link href="${xmlEscape(url)}"/>`,
      `    <summary>${xmlEscape(e.summary ?? `${e.type} in ${e.path}`)}</summary>`,
      `  </entry>`,
    ].join("\n");
  });
  return [...head, ...body, `</feed>`].join("\n");
}

/** Resolves the build-time timestamp for generated feed metadata; delegates to the shared clock helper. */
function buildNowISO(): string {
  return nowISO();
}
