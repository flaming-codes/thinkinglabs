import type { CollectionEntry } from "astro:content";
import type {
  DetailRelation,
  IndexStat,
  ObservationDetail,
  ObservationRow,
  ObservationsView,
} from "../../frontend/thinkinglabs-ui/types.ts";
import { detailHref, formatDate } from "../entity-routes.ts";
import { firstParagraph, markdownParagraphs } from "./text.ts";
import {
  type ClaimLookup,
  detailRelation,
  relatedClaimConfidence,
  safeDate,
  type TitleLookup,
} from "./ref-lookups.ts";

/** Build the observations index view from short first-party world notes. */
export function mapObservationsView(args: {
  entries: ReadonlyArray<CollectionEntry<"observations">>;
}): ObservationsView {
  const sorted = [...args.entries].sort(
    (a, b) => safeDate(b.data.observed) - safeDate(a.data.observed),
  );

  const observations: ObservationRow[] = sorted.map((entry) => {
    const links =
      entry.data.related_claims.length +
      entry.data.related_thoughts.length +
      entry.data.related_projects.length;
    return {
      slug: entry.id,
      observation: entry.data.observation,
      observed: formatDate(entry.data.observed),
      source: entry.data.source ?? "Tom",
      context: entry.data.context ?? firstParagraph(entry.body ?? "", entry.data.observation),
      tags: entry.data.tags,
      links,
      href: detailHref("observations", entry.id),
    };
  });

  const linked = observations.filter((observation) => observation.links > 0).length;
  const latest = observations[0]?.observed ?? "-";
  const stats: IndexStat[] = [
    { label: "On file", value: String(observations.length), sub: "short world notes" },
    { label: "Linked", value: String(linked), sub: "connected downstream" },
    { label: "Latest", value: latest, sub: "most recent observation" },
  ];

  return { total: observations.length, stats, observations };
}

/** Convert one observation entry into the observation detail view. */
export function mapObservationDetail(args: {
  entry: CollectionEntry<"observations">;
  lookups?: TitleLookup;
  claimLookup?: ClaimLookup;
}): ObservationDetail {
  const { entry, lookups = {}, claimLookup = new Map() } = args;
  const related: DetailRelation[] = [
    ...entry.data.related_claims.map((ref) => {
      const relation = detailRelation(ref, "claims", lookups);
      const conf = relatedClaimConfidence(claimLookup, ref);
      return conf === undefined ? relation : { ...relation, value: conf.toFixed(2) };
    }),
    ...entry.data.related_thoughts.map((ref) => detailRelation(ref, "thoughts", lookups)),
    ...entry.data.related_projects.map((ref) => detailRelation(ref, "projects", lookups)),
  ];

  return {
    slug: entry.id,
    observation: entry.data.observation,
    observed: formatDate(entry.data.observed),
    source: entry.data.source ?? "Tom",
    context: entry.data.context ?? "No context logged.",
    paragraphs: markdownParagraphs(entry.body ?? ""),
    related,
    tags: entry.data.tags,
  };
}
