import type { CollectionEntry } from "astro:content";
import type {
  DetailRelation,
  IndexStat,
  ProjectDetail,
  ProjectRow,
  ProjectsView,
} from "../../frontend/thinkinglabs-ui/types.ts";
import { detailHref, formatDate } from "../entity-routes.ts";
import {
  type ClaimLookup,
  detailRelation,
  relatedClaimConfidence,
  safeDate,
  type TitleLookup,
} from "./ref-lookups.ts";

const FILLED_PROJECT_STATUSES = new Set(["alive", "shipped"]);

function repositoryNameFromUrl(href: string): string {
  try {
    const url = new URL(href);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.at(-1) ?? "Repository";
  } catch {
    return "Repository";
  }
}

/** Build the projects index view from real project entries, with optional precomputed last-touched dates. */
export function mapProjectsView(args: {
  entries: ReadonlyArray<CollectionEntry<"projects">>;
  lastTouchedById?: ReadonlyMap<string, string>;
}): ProjectsView {
  const { entries, lastTouchedById } = args;
  const sorted = [...entries].sort((a, b) => {
    const left = lastTouchedById?.get(a.id) ?? a.data.last_touched ?? a.data.started;
    const right = lastTouchedById?.get(b.id) ?? b.data.last_touched ?? b.data.started;
    return safeDate(right) - safeDate(left);
  });

  const active = sorted.filter((entry) => entry.data.status === "alive").length;
  const shipped = sorted.filter((entry) => entry.data.status === "shipped").length;
  const total = sorted.length;

  const stats: IndexStat[] = [
    { label: "Active", value: String(active), sub: "currently in flight" },
    { label: "Shipped", value: String(shipped), sub: "publicly used" },
    { label: "On file", value: String(total), sub: "across every state" },
  ];

  const rows: ProjectRow[] = sorted.map((entry) => {
    const last =
      lastTouchedById?.get(entry.id) ?? formatDate(entry.data.last_touched ?? entry.data.started);
    return {
      slug: entry.id,
      title: entry.data.title,
      deck: entry.data.current_question ?? "No current question logged.",
      state: entry.data.status,
      stateFilled: FILLED_PROJECT_STATUSES.has(entry.data.status),
      started: formatDate(entry.data.started),
      last,
      stack: entry.data.tags.join(" · ") || "—",
      why: entry.data.help_welcome ?? "—",
      next: entry.data.current_question ?? "Awaiting next move.",
      href: detailHref("projects", entry.id),
    };
  });

  return { total, active, stats, rows };
}

/** Convert one project entry into the branded project detail view. */
export function mapProjectDetail(args: {
  entry: CollectionEntry<"projects">;
  lastTouched: string;
  lookups?: TitleLookup;
  claimLookup?: ClaimLookup;
}): ProjectDetail {
  const { entry, lastTouched, lookups = {}, claimLookup = new Map() } = args;
  const links: DetailRelation[] = [];
  if (entry.data.links.repo) {
    links.push({
      kind: "repo",
      title: repositoryNameFromUrl(entry.data.links.repo),
      href: entry.data.links.repo,
    });
  }
  if (entry.data.links.productive_id) {
    links.push({
      kind: "productive",
      title: entry.data.links.productive_id,
      value: entry.data.links.productive_id,
    });
  }

  return {
    slug: entry.id,
    title: entry.data.title,
    status: entry.data.status,
    started: formatDate(entry.data.started),
    lastTouched,
    currentQuestion: entry.data.current_question ?? "No current question logged.",
    helpWelcome: entry.data.help_welcome ?? "No help request logged.",
    tags: entry.data.tags,
    links,
    relatedThoughts: entry.data.related_thoughts.map((ref) =>
      detailRelation(ref, "thoughts", lookups),
    ),
    relatedClaims: entry.data.related_claims.map((ref) => {
      const relation = detailRelation(ref, "claims", lookups);
      const conf = relatedClaimConfidence(claimLookup, ref);
      return conf === undefined ? relation : { ...relation, value: conf.toFixed(2) };
    }),
  };
}
