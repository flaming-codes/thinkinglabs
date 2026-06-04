import type { CollectionEntry } from "astro:content";
import type {
  ThoughtDetail,
  ThoughtHistory,
  ThoughtRelated,
  ThoughtSummary,
} from "../../frontend/thinkinglabs-ui/types.ts";
import { detailHref, formatDate } from "../entity-routes.ts";
import type { FileHistoryEntry } from "../git.ts";
import {
  firstParagraph,
  markdownParagraphs,
  minutesForWords,
  stripInlineMarkdown,
  truncate,
  wordCount,
} from "./text.ts";
import {
  type ClaimLookup,
  kindLabel,
  relatedClaimConfidence,
  safeDate,
  type TitleLookup,
  titleFromLookup,
} from "./ref-lookups.ts";

function thoughtState(tags: readonly string[]): ThoughtSummary["state"] {
  const lowered = tags.map((tag) => tag.toLowerCase());
  if (lowered.some((tag) => tag.includes("draft") || tag === "wip")) return "drafting";
  if (lowered.some((tag) => tag.includes("question") || tag.includes("thinking"))) {
    return "still-thinking";
  }
  return "settled";
}

function extractQuestions(body: string): string[] {
  const lines = body.split(/\r?\n/);
  const fromQuestionSection: string[] = [];
  let inQuestions = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^##\s+/i.test(line)) {
      inQuestions = /question/i.test(line);
      continue;
    }
    if (!inQuestions) continue;
    const listItem = line.replace(/^([-*+]\s+|\d+\.\s+)/, "").trim();
    if (listItem.length === 0) continue;
    fromQuestionSection.push(stripInlineMarkdown(listItem));
  }

  if (fromQuestionSection.length > 0) return fromQuestionSection.slice(0, 4);

  const inferred = stripInlineMarkdown(body)
    .split(/(?<=[?.!])\s+/)
    .filter((sentence) => sentence.trim().endsWith("?"))
    .map((sentence) => sentence.trim());
  return inferred.slice(0, 4);
}

/** Convert thought entries into listing rows with derived excerpt, word count, and state. */
export function mapThoughtSummaries(
  thoughts: ReadonlyArray<CollectionEntry<"thoughts">>,
): ThoughtSummary[] {
  return [...thoughts]
    .sort((a, b) => safeDate(b.data.updated) - safeDate(a.data.updated))
    .map((thought) => {
      const words = wordCount(thought.body ?? "");
      return {
        slug: thought.id,
        title: thought.data.title,
        excerpt: truncate(firstParagraph(thought.body ?? "", thought.data.title), 220),
        words,
        minutes: minutesForWords(words),
        state: thoughtState(thought.data.tags),
        touched: formatDate(thought.data.updated),
        backlinks:
          thought.data.claims.length +
          thought.data.inputs.length +
          (thought.data.observations ?? []).length,
        href: detailHref("thoughts", thought.id),
      };
    });
}

/** Convert git file history snapshots into compact thought revision timeline rows. */
export function mapThoughtHistory(history: ReadonlyArray<FileHistoryEntry>): ThoughtHistory[] {
  const ordered = [...history].reverse();
  return ordered.slice(0, 8).map((entry) => ({
    date: formatDate(entry.isoDate),
    note: entry.subject ?? "updated",
  }));
}

/** Convert one thought entry plus lookup data into the shared thought-detail composition shape. */
export function mapThoughtDetail(args: {
  entry: CollectionEntry<"thoughts">;
  lookups?: TitleLookup;
  claimLookup?: ClaimLookup;
  history?: ReadonlyArray<ThoughtHistory>;
  predictionEvidence?: ReadonlyArray<ThoughtRelated>;
}): ThoughtDetail {
  const {
    entry,
    lookups = {},
    claimLookup = new Map(),
    history = [],
    predictionEvidence = [],
  } = args;
  const words = wordCount(entry.body ?? "");
  const related: ThoughtRelated[] = [
    ...entry.data.claims.map((ref) => {
      const resolved = titleFromLookup(ref, "claims", lookups);
      const conf = relatedClaimConfidence(claimLookup, ref);
      return {
        kind: kindLabel(resolved.kind),
        title: resolved.title,
        ...(conf !== undefined ? { conf } : {}),
        href: resolved.href,
      };
    }),
    ...entry.data.inputs.map((ref) => {
      const resolved = titleFromLookup(ref, "inputs", lookups);
      return {
        kind: kindLabel(resolved.kind),
        title: resolved.title,
        href: resolved.href,
      };
    }),
    ...(entry.data.observations ?? []).map((ref) => {
      const resolved = titleFromLookup(ref, "observations", lookups);
      return {
        kind: kindLabel(resolved.kind),
        title: resolved.title,
        href: resolved.href,
      };
    }),
  ];

  return {
    title: entry.data.title,
    slug: entry.id,
    state: thoughtState(entry.data.tags),
    started: formatDate(entry.data.created),
    touched: formatDate(entry.data.updated),
    words,
    minutes: minutesForWords(words),
    paragraphs: markdownParagraphs(entry.body ?? ""),
    questions: extractQuestions(entry.body ?? ""),
    related,
    predictionEvidence: [...predictionEvidence],
    history:
      history.length > 0
        ? [...history]
        : [{ date: formatDate(entry.data.updated), note: "current version" }],
  };
}
