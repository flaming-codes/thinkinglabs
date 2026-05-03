#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadContent } from "../src/lib/content-repo.ts";
import { env } from "../src/lib/env.ts";

/** Default site URL pulled from the validated env; overridable via `--site=` so test/staging builds can swap it. */
const DEFAULT_SITE_URL = env().SITE_URL;

/** JSON Feed 1.1 item shape (subset we populate). See https://jsonfeed.org/version/1.1. */
export interface JsonFeedItem {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly content_text: string;
  readonly date_published: string;
}

/** JSON Feed 1.1 envelope shape (subset we populate). */
export interface JsonFeed {
  readonly version: "https://jsonfeed.org/version/1.1";
  readonly title: string;
  readonly home_page_url: string;
  readonly feed_url: string;
  readonly items: ReadonlyArray<JsonFeedItem>;
}

/** Names of the deterministic feeds emitted at site-build time; brain-diff feeds are emitted by `pnpm brain-diff` post-deploy. */
export const DETERMINISTIC_FEEDS = [
  "claims-revised",
  "decisions-reversed",
  "predictions-resolved",
] as const;

/** Build options for the deterministic feed generator; defaults match site-build invocation from `prebuild`. */
export interface BuildFeedsOptions {
  readonly cwd?: string;
  readonly outDir?: string;
  readonly siteUrl?: string;
}

/** Result returned by `buildFeeds`; one record per generated file. */
export interface BuildFeedsResult {
  readonly path: string;
  readonly feed: JsonFeed;
}

/** ISO comparator: missing values sink to the bottom; otherwise descending lexical order (ISO sorts correctly). */
function compareIsoDesc(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  if (a === b) return 0;
  return a < b ? 1 : -1;
}

/** Tie-breaker by id (ascending) so equal-date entries have a deterministic order. */
function compareIdAsc(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Narrow loader-opts builder; respects `exactOptionalPropertyTypes` by omitting `cwd` when unset. */
function loadOpts(opts: BuildFeedsOptions): { cwd?: string } | undefined {
  return opts.cwd === undefined ? undefined : { cwd: opts.cwd };
}

/** Build the `claims-revised` JSON Feed: claims with status != active OR non-empty `supersedes`/`superseded_by`; sorted by `last_reviewed` desc, then id. */
export function buildClaimsRevised(opts: BuildFeedsOptions): JsonFeed {
  const site = opts.siteUrl ?? DEFAULT_SITE_URL;
  const entries = loadContent("claims", loadOpts(opts));
  const items: JsonFeedItem[] = entries
    .filter((e) => {
      const d = e.data;
      return (
        d.status !== "active" ||
        (d.supersedes?.length ?? 0) > 0 ||
        (d.superseded_by?.length ?? 0) > 0
      );
    })
    .map((e) => {
      const url = `${site}/claims/${e.slug}`;
      return {
        id: url,
        url,
        title: e.data.claim,
        content_text: `status=${e.data.status}; confidence=${e.data.confidence}`,
        date_published: e.data.last_reviewed,
      };
    })
    .sort((a, b) => compareIsoDesc(a.date_published, b.date_published) || compareIdAsc(a.id, b.id));
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: "Claims revised",
    home_page_url: `${site}/claims`,
    feed_url: `${site}/feed/claims-revised.json`,
    items,
  };
}

/** Build the `decisions-reversed` JSON Feed: decisions with status `reversed`/`superseded` OR non-empty `reverses`; sorted by `date` desc, then id. */
export function buildDecisionsReversed(opts: BuildFeedsOptions): JsonFeed {
  const site = opts.siteUrl ?? DEFAULT_SITE_URL;
  const entries = loadContent("decisions", loadOpts(opts));
  const items: JsonFeedItem[] = entries
    .filter((e) => {
      const d = e.data;
      return d.status === "reversed" || d.status === "superseded" || (d.reverses?.length ?? 0) > 0;
    })
    .map((e) => {
      const url = `${site}/decisions/${e.slug}`;
      const reverses = (e.data.reverses ?? []).join(",") || "(none)";
      return {
        id: url,
        url,
        title: e.data.decision,
        content_text: `status=${e.data.status}; reverses=${reverses}`,
        date_published: e.data.date,
      };
    })
    .sort((a, b) => compareIsoDesc(a.date_published, b.date_published) || compareIdAsc(a.id, b.id));
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: "Decisions reversed",
    home_page_url: `${site}/decisions`,
    feed_url: `${site}/feed/decisions-reversed.json`,
    items,
  };
}

/** Build the `predictions-resolved` JSON Feed: every prediction with resolution != pending; sorted by `resolved_on` (or `made`) desc, then id. */
export function buildPredictionsResolved(opts: BuildFeedsOptions): JsonFeed {
  const site = opts.siteUrl ?? DEFAULT_SITE_URL;
  const entries = loadContent("predictions", loadOpts(opts));
  const items: JsonFeedItem[] = entries
    .filter((e) => e.data.resolution !== "pending")
    .map((e) => {
      const url = `${site}/predictions/${e.slug}`;
      const datePublished = e.data.resolved_on ?? e.data.made;
      return {
        id: url,
        url,
        title: e.data.prediction,
        content_text: `resolution=${e.data.resolution}; confidence=${e.data.confidence}`,
        date_published: datePublished,
      };
    })
    .sort((a, b) => compareIsoDesc(a.date_published, b.date_published) || compareIdAsc(a.id, b.id));
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: "Predictions resolved",
    home_page_url: `${site}/predictions`,
    feed_url: `${site}/feed/predictions-resolved.json`,
    items,
  };
}

/** Build all three deterministic JSON feeds in memory; returns one record per output file. */
export function buildFeeds(opts: BuildFeedsOptions = {}): ReadonlyArray<BuildFeedsResult> {
  const cwd = resolve(opts.cwd ?? process.cwd());
  const outDir = resolve(cwd, opts.outDir ?? "public/feed");
  return [
    { path: resolve(outDir, "claims-revised.json"), feed: buildClaimsRevised(opts) },
    { path: resolve(outDir, "decisions-reversed.json"), feed: buildDecisionsReversed(opts) },
    { path: resolve(outDir, "predictions-resolved.json"), feed: buildPredictionsResolved(opts) },
  ];
}

/** Write all three deterministic feeds to disk; creates the output dir as needed. Returns the written paths. */
export function writeFeeds(opts: BuildFeedsOptions = {}): ReadonlyArray<string> {
  const cwd = resolve(opts.cwd ?? process.cwd());
  const outDir = resolve(cwd, opts.outDir ?? "public/feed");
  mkdirSync(outDir, { recursive: true });
  const built = buildFeeds(opts);
  const written: string[] = [];
  for (const { path, feed } of built) {
    writeFileSync(path, `${JSON.stringify(feed, null, 2)}\n`, "utf8");
    written.push(path);
  }
  return written;
}

/** CLI entry: writes the three deterministic feeds and prints a one-line summary. */
export function main(argv: ReadonlyArray<string> = process.argv.slice(2)): void {
  const opts: { cwd?: string; outDir?: string; siteUrl?: string } = {};
  for (const a of argv) {
    if (a.startsWith("--out=")) opts.outDir = a.slice("--out=".length);
    else if (a.startsWith("--cwd=")) opts.cwd = a.slice("--cwd=".length);
    else if (a.startsWith("--site=")) opts.siteUrl = a.slice("--site=".length);
    else throw new Error(`unknown arg: ${a}`);
  }
  const written = writeFeeds(opts);
  process.stdout.write(`wrote ${written.length} deterministic feeds:\n`);
  for (const p of written) process.stdout.write(`  ${p}\n`);
}

/** True iff this module was started directly as a script (vs imported by tests); tsx runs the source path verbatim. */
function isDirectInvocation(): boolean {
  const entry = process.argv[1] ?? "";
  return entry.endsWith("build-feeds.ts") || entry.endsWith("build-feeds.js");
}

if (isDirectInvocation()) {
  try {
    main();
  } catch (e: unknown) {
    process.stderr.write(`${(e as Error).message ?? String(e)}\n`);
    process.exit(1);
  }
}
