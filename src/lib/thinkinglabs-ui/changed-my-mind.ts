import type { CollectionEntry } from "astro:content";
import type {
  ChangedMyMindDetail,
  ChangedMyMindView,
  FlipSummary,
  IndexStat,
} from "../../frontend/thinkinglabs-ui/types.ts";
import { detailHref, formatDate } from "../entity-routes.ts";
import { stripKindPrefix, stripMdExt } from "../refs.ts";
import {
  type ClaimLookup,
  detailRelation,
  relatedClaimConfidence,
  safeDate,
  type TitleLookup,
} from "./ref-lookups.ts";

function monthsBetween(from: Date | string, to: Date | string): number {
  const fromMs = safeDate(from);
  const toMs = safeDate(to);
  if (fromMs === 0 || toMs === 0) return 0;
  return Math.max(0, Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24 * 30)));
}

function heldLabel(months: number): string {
  if (months >= 24) return `${Math.round(months / 12)} years`;
  if (months >= 1) return `${months} months`;
  return "less than a month";
}

/** Build the changed-my-mind index view from real entries; confidence numbers are scrubbed from referenced claims. */
export function mapChangedMyMindView(args: {
  entries: ReadonlyArray<CollectionEntry<"changed-my-mind">>;
  claims?: ReadonlyArray<CollectionEntry<"claims">>;
}): ChangedMyMindView {
  const claimLookup = new Map(
    (args.claims ?? []).map((claim) => [claim.id, claim.data.confidence]),
  );
  const sorted = [...args.entries].sort((a, b) => safeDate(b.data.date) - safeDate(a.data.date));

  const flips: FlipSummary[] = sorted.map((entry) => {
    const supersededIds = entry.data.superseded_claims
      .map((ref) => stripKindPrefix(stripMdExt(ref)))
      .filter((id) => claimLookup.has(id));
    const confNow =
      supersededIds.length > 0
        ? supersededIds.reduce((sum, id) => sum + (claimLookup.get(id) ?? 0), 0) /
          supersededIds.length
        : 0.3;
    const confThen = Math.min(0.95, confNow + 0.35);
    const months = monthsBetween(entry.data.date, new Date());
    return {
      slug: entry.id,
      title: entry.data.title,
      flippedOn: formatDate(entry.data.date),
      held: heldLabel(months),
      confThen,
      confNow,
      tipper: entry.data.what_changed,
      topic: entry.data.tags[0] ?? "general",
      href: detailHref("changed-my-mind", entry.id),
    };
  });

  const swing =
    flips.length > 0
      ? flips.reduce((sum, f) => sum + Math.abs(f.confNow - f.confThen), 0) / flips.length
      : 0;

  const stats: IndexStat[] = [
    { label: "Flips logged", value: String(flips.length), sub: "since the log started" },
    {
      label: "Average swing",
      value: flips.length > 0 ? swing.toFixed(2) : "—",
      sub: "across confidence values",
    },
    {
      label: "Most recent",
      value: flips[0] ? flips[0].flippedOn : "—",
      sub: "last time something broke",
    },
  ];

  return { total: flips.length, stats, flips };
}

/** Convert one belief-revision entry into the branded changed-my-mind detail view. */
export function mapChangedMyMindDetail(args: {
  entry: CollectionEntry<"changed-my-mind">;
  lookups?: TitleLookup;
  claimLookup?: ClaimLookup;
}): ChangedMyMindDetail {
  const { entry, lookups = {}, claimLookup = new Map() } = args;
  return {
    slug: entry.id,
    title: entry.data.title,
    date: formatDate(entry.data.date),
    usedToBelieve: entry.data.used_to_believe,
    whatChanged: entry.data.what_changed,
    nowBelieve: entry.data.now_believe,
    supersededClaims: entry.data.superseded_claims.map((ref) => {
      const relation = detailRelation(ref, "claims", lookups);
      const conf = relatedClaimConfidence(claimLookup, ref);
      return conf === undefined ? relation : { ...relation, value: conf.toFixed(2) };
    }),
    tags: entry.data.tags,
  };
}
