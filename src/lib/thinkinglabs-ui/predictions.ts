import type { CollectionEntry } from "astro:content";
import type {
  CalibrationData,
  IndexStat,
  PredictionRow,
  PredictionsView,
} from "../../frontend/thinkinglabs-ui/types.ts";
import { calibration } from "../calibration.ts";
import { detailHref, formatDate } from "../entity-routes.ts";
import {
  kindLabel,
  parseRef,
  safeDate,
  type TitleLookup,
  titleFromLookupCandidates,
} from "./ref-lookups.ts";

const LOG_EPSILON = 1e-6;

type PredictionEvidenceTargetKind = "thoughts" | "inputs" | "observations";

function evidenceRefTargets(
  ref: string,
  targetKind: PredictionEvidenceTargetKind,
  slug: string,
): boolean {
  const parsed = parseRef(ref, "thoughts");
  if (targetKind === "observations" && parsed.kind === "thoughts" && parsed.slug === slug) {
    return !ref.includes("/");
  }
  return parsed.kind === targetKind && parsed.slug === slug;
}

function predictionTopic(tags: readonly string[]): string {
  return (tags[0] ?? "general").replace(/-/g, " ");
}

function daysBetween(fromIso: string, target: Date | string): number {
  const fromMs = safeDate(fromIso);
  const toMs = typeof target === "string" ? safeDate(target) : target.getTime();
  if (fromMs === 0 || toMs === 0) return 0;
  return Math.max(0, Math.round((fromMs - toMs) / (1000 * 60 * 60 * 24)));
}

/** Find predictions that cite a thought or input in `evidence_at_time`; reverse links stay derived. */
export function predictionEvidenceBacklinks(args: {
  predictions: ReadonlyArray<CollectionEntry<"predictions">>;
  targetKind: PredictionEvidenceTargetKind;
  targetSlug: string;
}): ReadonlyArray<{ kind: string; title: string; href: string; conf: number; date: string }> {
  return [...args.predictions]
    .filter((prediction) =>
      prediction.data.evidence_at_time.some((ref) =>
        evidenceRefTargets(ref, args.targetKind, args.targetSlug),
      ),
    )
    .sort((a, b) => safeDate(b.data.made) - safeDate(a.data.made))
    .map((prediction) => ({
      kind: kindLabel("predictions"),
      title: prediction.data.prediction,
      href: detailHref("predictions", prediction.id),
      conf: prediction.data.confidence,
      date: formatDate(prediction.data.made),
    }));
}

/** Compute calibration metrics/buckets and recent rows from real predictions collection entries. */
export function mapCalibrationData(
  predictions: ReadonlyArray<CollectionEntry<"predictions">>,
): CalibrationData {
  const resolved = predictions.filter(
    (entry) => entry.data.resolution === "true" || entry.data.resolution === "false",
  );
  const pending = predictions.length - resolved.length;
  const bins = calibration(
    resolved.map((entry) => ({
      confidence: entry.data.confidence,
      resolution: entry.data.resolution,
    })),
  ).map((bucket) => ({
    stated: Number(bucket.mid.toFixed(2)),
    n: bucket.total,
    hit: bucket.accuracy === null ? null : Number(bucket.accuracy.toFixed(2)),
  }));

  const brier = resolved.reduce((sum, entry) => {
    const actual = entry.data.resolution === "true" ? 1 : 0;
    const diff = entry.data.confidence - actual;
    return sum + diff * diff;
  }, 0);

  const logLoss = resolved.reduce((sum, entry) => {
    const actual = entry.data.resolution === "true" ? 1 : 0;
    const p = Math.min(1 - LOG_EPSILON, Math.max(LOG_EPSILON, entry.data.confidence));
    return sum - (actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
  }, 0);

  const recent = [...predictions]
    .sort((a, b) => {
      const left = a.data.resolved_on ?? a.data.resolves;
      const right = b.data.resolved_on ?? b.data.resolves;
      return safeDate(right) - safeDate(left);
    })
    .slice(0, 10)
    .map((entry) => ({
      title: entry.data.prediction,
      stated: entry.data.confidence,
      outcome:
        entry.data.resolution === "true" ? true : entry.data.resolution === "false" ? false : null,
      ...(entry.data.resolution === "true" || entry.data.resolution === "false"
        ? { resolved: formatDate(entry.data.resolved_on ?? entry.data.resolves) }
        : { due: formatDate(entry.data.resolves) }),
      href: detailHref("predictions", entry.id),
    }));

  return {
    brier: resolved.length > 0 ? brier / resolved.length : 0,
    log: resolved.length > 0 ? logLoss / resolved.length : 0,
    count: predictions.length,
    resolved: resolved.length,
    pending,
    bins,
    recent,
  };
}

/** Map a single prediction entry into the shape the detail composition expects. */
export function mapPredictionDetail(args: {
  entry: CollectionEntry<"predictions">;
  lookups?: TitleLookup;
  now?: Date;
}): {
  slug: string;
  prediction: string;
  confidence: number;
  made: string;
  resolves: string;
  resolvedOn: string | null;
  resolution: "pending" | "true" | "false" | "ambiguous";
  resolutionNote: string | null;
  daysUntil: number | null;
  daysSinceMade: number | null;
  topic: string;
  tags: readonly string[];
  evidence: { label: string; href?: string }[];
} {
  const { entry, lookups = {}, now = new Date() } = args;
  const data = entry.data;
  const dayMs = 1000 * 60 * 60 * 24;
  const nowMs = now.getTime();
  const resolvesMs = safeDate(data.resolves);
  const madeMs = safeDate(data.made);
  const daysUntil = resolvesMs === 0 ? null : Math.round((resolvesMs - nowMs) / dayMs);
  const daysSinceMade = madeMs === 0 ? null : Math.round((nowMs - madeMs) / dayMs);
  const evidence = data.evidence_at_time.map((ref) => {
    const resolved = titleFromLookupCandidates(
      ref,
      ["thoughts", "inputs", "observations"],
      lookups,
    );
    return { label: resolved.title, href: resolved.href };
  });
  return {
    slug: entry.id,
    prediction: data.prediction,
    confidence: data.confidence,
    made: formatDate(data.made),
    resolves: formatDate(data.resolves),
    resolvedOn: data.resolved_on ? formatDate(data.resolved_on) : null,
    resolution: data.resolution,
    resolutionNote: data.resolution_note,
    daysUntil,
    daysSinceMade,
    topic: predictionTopic(data.tags),
    tags: data.tags,
    evidence,
  };
}

/** Build the predictions index view from real prediction entries; days-to-resolve is computed against `now`. */
export function mapPredictionsView(args: {
  entries: ReadonlyArray<CollectionEntry<"predictions">>;
  now?: Date;
}): PredictionsView {
  const now = args.now ?? new Date();

  const open: PredictionRow[] = [];
  const resolved: PredictionRow[] = [];

  const sortedEntries = [...args.entries].sort(
    (a, b) => safeDate(b.data.made) - safeDate(a.data.made),
  );

  for (const entry of sortedEntries) {
    const isResolved = entry.data.resolution === "true" || entry.data.resolution === "false";
    if (isResolved) {
      resolved.push({
        slug: entry.id,
        title: entry.data.prediction,
        conf: entry.data.confidence,
        due: formatDate(entry.data.resolves),
        days: 0,
        state: "resolved",
        topic: predictionTopic(entry.data.tags),
        outcome: entry.data.resolution as "true" | "false",
        resolvedDate: formatDate(entry.data.resolved_on ?? entry.data.resolves),
        href: detailHref("predictions", entry.id),
      });
    } else {
      const dueIso = entry.data.resolves;
      open.push({
        slug: entry.id,
        title: entry.data.prediction,
        conf: entry.data.confidence,
        due: formatDate(entry.data.resolves),
        days: daysBetween(dueIso, now),
        state: "open",
        topic: predictionTopic(entry.data.tags),
        href: detailHref("predictions", entry.id),
      });
    }
  }

  resolved.sort((a, b) => safeDate(b.resolvedDate ?? "") - safeDate(a.resolvedDate ?? ""));

  const trueCount = resolved.filter((p) => p.outcome === "true").length;
  const trueRatio = resolved.length > 0 ? Math.round((trueCount / resolved.length) * 100) : 0;
  const brier =
    resolved.length > 0
      ? resolved.reduce((sum, p) => {
          const actual = p.outcome === "true" ? 1 : 0;
          const diff = p.conf - actual;
          return sum + diff * diff;
        }, 0) / resolved.length
      : 0;

  const stats: IndexStat[] = [
    { label: "Open", value: String(open.length), sub: "currently being held" },
    {
      label: "Resolved true",
      value: resolved.length > 0 ? `${trueCount}/${resolved.length}` : "—",
      sub: resolved.length > 0 ? `${trueRatio}% of resolved` : "no resolutions yet",
    },
    {
      label: "Brier score",
      value: resolved.length > 0 ? brier.toFixed(2) : "—",
      sub: "lower is better; chance is 0.25",
    },
    {
      label: "On file",
      value: String(open.length + resolved.length),
      sub: "predictions tracked",
    },
  ];

  return { open, resolved, stats };
}
