import type { CollectionEntry } from "astro:content";
import type {
  IndexStat,
  QuestionDetail,
  QuestionRow,
  QuestionsView,
} from "../../frontend/thinkinglabs-ui/types.ts";
import { detailHref, formatDate } from "../entity-routes.ts";
import {
  type ClaimLookup,
  detailRelation,
  relatedClaimConfidence,
  safeDate,
  type TitleLookup,
} from "./ref-lookups.ts";

function questionHeat(entry: CollectionEntry<"questions">, now: Date): number {
  const ageDays = (now.getTime() - safeDate(entry.data.asked)) / (1000 * 60 * 60 * 24);
  const recent = ageDays <= 60 ? 2 : ageDays <= 180 ? 1 : 0;
  const traction = Math.min(2, entry.data.attempts.length);
  const links = Math.min(1, entry.data.related_claims.length + entry.data.related_projects.length);
  return Math.max(1, Math.min(5, recent + traction + links + 1));
}

/** Build the questions index view from real entries; heat is derived from recency, attempts, and links. */
export function mapQuestionsView(args: {
  entries: ReadonlyArray<CollectionEntry<"questions">>;
  now?: Date;
}): QuestionsView {
  const now = args.now ?? new Date();
  const open = [...args.entries]
    .filter((entry) => entry.data.status !== "closed")
    .sort((a, b) => safeDate(b.data.asked) - safeDate(a.data.asked));

  const questions: QuestionRow[] = open.map((entry) => ({
    slug: entry.id,
    title: entry.data.question,
    asked: formatDate(entry.data.asked),
    heat: questionHeat(entry, now),
    deck: entry.data.context ?? "—",
    wouldResolve: entry.data.ideal_responder ?? "An informed take.",
    topic: entry.data.tags[0] ?? "general",
    related: entry.data.attempts.slice(0, 2),
    href: detailHref("questions", entry.id),
  }));

  const hotCount = questions.filter((q) => q.heat >= 4).length;

  const stats: IndexStat[] = [
    { label: "Open", value: String(questions.length), sub: "without an answer I trust" },
    { label: "Hot", value: String(hotCount), sub: "actively being chased" },
    { label: "On file", value: String(args.entries.length), sub: "questions tracked" },
  ];

  return { total: questions.length, stats, questions };
}

/** Convert one question entry into the branded question detail view. */
export function mapQuestionDetail(args: {
  entry: CollectionEntry<"questions">;
  lookups?: TitleLookup;
  claimLookup?: ClaimLookup;
  responseAction: string;
}): QuestionDetail {
  const { entry, lookups = {}, claimLookup = new Map(), responseAction } = args;
  return {
    slug: entry.id,
    question: entry.data.question,
    status: entry.data.status,
    asked: formatDate(entry.data.asked),
    context: entry.data.context ?? "No context logged.",
    idealResponder: entry.data.ideal_responder ?? "An informed responder with direct evidence.",
    attempts: entry.data.attempts,
    relatedClaims: entry.data.related_claims.map((ref) => {
      const relation = detailRelation(ref, "claims", lookups);
      const conf = relatedClaimConfidence(claimLookup, ref);
      return conf === undefined ? relation : { ...relation, value: conf.toFixed(2) };
    }),
    relatedProjects: entry.data.related_projects.map((ref) =>
      detailRelation(ref, "projects", lookups),
    ),
    tags: entry.data.tags,
    responseAction,
  };
}
