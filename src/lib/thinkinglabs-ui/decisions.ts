import type { CollectionEntry } from "astro:content";
import type {
  DecisionDetail,
  DecisionRow,
  DecisionsView,
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

function decisionState(status: string): DecisionRow["state"] {
  if (status === "reversed") return "reversed";
  if (status === "superseded") return "archived";
  return "active";
}

/** Build the decisions index view from real entries, partitioned by status. */
export function mapDecisionsView(
  entries: ReadonlyArray<CollectionEntry<"decisions">>,
): DecisionsView {
  const sorted = [...entries].sort((a, b) => safeDate(b.data.date) - safeDate(a.data.date));

  const rows: DecisionRow[] = sorted.map((entry) => ({
    slug: entry.id,
    title: entry.data.decision,
    date: formatDate(entry.data.date),
    state: decisionState(entry.data.status),
    summary: entry.data.context ?? entry.data.why ?? "—",
    review: entry.data.follow_up_on ? formatDate(entry.data.follow_up_on) : null,
    ...(entry.data.reverses[0]
      ? { reversedBy: stripKindPrefix(stripMdExt(entry.data.reverses[0])) }
      : {}),
    href: detailHref("decisions", entry.id),
  }));

  const active = rows.filter((row) => row.state === "active");
  const reversed = rows.filter((row) => row.state === "reversed");
  const archived = rows.filter((row) => row.state === "archived");
  const total = rows.length;
  const reversalRate = total > 0 ? Math.round((reversed.length / total) * 100) : 0;

  const stats: IndexStat[] = [
    { label: "Active", value: String(active.length), sub: "currently in force" },
    { label: "Reversed", value: String(reversed.length), sub: "kept on file" },
    {
      label: "Reversal rate",
      value: total > 0 ? `${reversalRate}%` : "—",
      sub: "of decisions logged",
    },
  ];

  return { total, active, reversed, archived, stats };
}

/** Convert one decision entry into the branded decision detail view. */
export function mapDecisionDetail(args: {
  entry: CollectionEntry<"decisions">;
  reversedBy?: ReadonlyArray<string>;
  lookups?: TitleLookup;
  claimLookup?: ClaimLookup;
}): DecisionDetail {
  const { entry, reversedBy = [], lookups = {}, claimLookup = new Map() } = args;
  return {
    slug: entry.id,
    title: entry.data.decision,
    status: entry.data.status,
    date: formatDate(entry.data.date),
    chosen: entry.data.chosen,
    why: entry.data.why ?? "No explicit why logged.",
    context: entry.data.context ?? "No context logged.",
    options: entry.data.options_considered,
    changeTrigger: entry.data.what_would_change_my_mind ?? "No reversal condition logged.",
    followUp: entry.data.follow_up_on ? formatDate(entry.data.follow_up_on) : null,
    reverses: entry.data.reverses.map((ref) => detailRelation(ref, "decisions", lookups)),
    reversedBy: reversedBy.map((ref) => detailRelation(ref, "decisions", lookups)),
    relatedClaims: entry.data.related_claims.map((ref) => {
      const relation = detailRelation(ref, "claims", lookups);
      const conf = relatedClaimConfidence(claimLookup, ref);
      return conf === undefined ? relation : { ...relation, value: conf.toFixed(2) };
    }),
    relatedProjects: entry.data.related_projects.map((ref) =>
      detailRelation(ref, "projects", lookups),
    ),
    tags: entry.data.tags,
  };
}
