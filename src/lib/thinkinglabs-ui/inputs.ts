import type { CollectionEntry } from "astro:content";
import type {
  IndexStat,
  InputDetail,
  InputRow,
  InputsView,
} from "../../frontend/thinkinglabs-ui/types.ts";
import { detailHref, formatDate } from "../entity-routes.ts";
import { kindLabel, parseRef, safeDate } from "./ref-lookups.ts";

type InputCitationBacklink = {
  kind: string;
  title: string;
  href: string;
  conf?: number;
  date?: string;
};

function refTargetsInput(ref: string, slug: string): boolean {
  const parsed = parseRef(ref, "inputs");
  return parsed.kind === "inputs" && parsed.slug === slug;
}

function sortInputCitationBacklinks(
  citations: ReadonlyArray<InputCitationBacklink>,
): InputCitationBacklink[] {
  return [...citations].sort((a, b) => {
    const dateDelta = safeDate(b.date) - safeDate(a.date);
    if (dateDelta !== 0) return dateDelta;
    const kindDelta = a.kind.localeCompare(b.kind);
    if (kindDelta !== 0) return kindDelta;
    return a.title.localeCompare(b.title);
  });
}

function inputKind(input: CollectionEntry<"inputs">): string {
  const tags = input.data.tags.map((tag) => tag.toLowerCase());
  if (tags.includes("book")) return "book";
  if (tags.includes("paper")) return "paper";
  if (tags.includes("video")) return "video";
  if (tags.includes("podcast")) return "podcast";
  if (tags.includes("essay")) return "essay";
  return "article";
}

/** Derive pages that directly cite an input through canonical markdown link fields. */
export function inputCitationBacklinks(args: {
  targetSlug: string;
  thoughts?: ReadonlyArray<CollectionEntry<"thoughts">>;
  claims?: ReadonlyArray<CollectionEntry<"claims">>;
  predictions?: ReadonlyArray<CollectionEntry<"predictions">>;
  posts?: ReadonlyArray<CollectionEntry<"posts">>;
}): ReadonlyArray<InputCitationBacklink> {
  const citations: InputCitationBacklink[] = [];

  for (const thought of args.thoughts ?? []) {
    if (!thought.data.inputs.some((ref) => refTargetsInput(ref, args.targetSlug))) continue;
    citations.push({
      kind: kindLabel("thoughts"),
      title: thought.data.title,
      href: detailHref("thoughts", thought.id),
      date: formatDate(thought.data.updated),
    });
  }

  for (const claim of args.claims ?? []) {
    if (!claim.data.derived_from.some((ref) => refTargetsInput(ref, args.targetSlug))) continue;
    citations.push({
      kind: kindLabel("claims"),
      title: claim.data.claim,
      href: detailHref("claims", claim.id),
      conf: claim.data.confidence,
      date: formatDate(claim.data.last_reviewed),
    });
  }

  for (const prediction of args.predictions ?? []) {
    if (!prediction.data.evidence_at_time.some((ref) => refTargetsInput(ref, args.targetSlug))) {
      continue;
    }
    citations.push({
      kind: kindLabel("predictions"),
      title: prediction.data.prediction,
      href: detailHref("predictions", prediction.id),
      conf: prediction.data.confidence,
      date: formatDate(prediction.data.made),
    });
  }

  for (const post of args.posts ?? []) {
    if (!post.data.inputs.some((ref) => refTargetsInput(ref, args.targetSlug))) continue;
    citations.push({
      kind: kindLabel("posts"),
      title: post.data.title,
      href: detailHref("posts", post.id),
      date: formatDate(post.data.updated),
    });
  }

  return sortInputCitationBacklinks(citations);
}

/** Count direct input citations once per citing page. */
export function inputCitationCounts(args: {
  inputs: ReadonlyArray<CollectionEntry<"inputs">>;
  thoughts?: ReadonlyArray<CollectionEntry<"thoughts">>;
  claims?: ReadonlyArray<CollectionEntry<"claims">>;
  predictions?: ReadonlyArray<CollectionEntry<"predictions">>;
  posts?: ReadonlyArray<CollectionEntry<"posts">>;
}): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const input of args.inputs) {
    const backlinksArgs = {
      targetSlug: input.id,
      ...(args.thoughts !== undefined ? { thoughts: args.thoughts } : {}),
      ...(args.claims !== undefined ? { claims: args.claims } : {}),
      ...(args.predictions !== undefined ? { predictions: args.predictions } : {}),
      ...(args.posts !== undefined ? { posts: args.posts } : {}),
    };
    const count = inputCitationBacklinks(backlinksArgs).length;
    counts.set(input.id, count);
  }
  return counts;
}

/** Build the inputs index view from real entries; influence is the derived citation count. */
export function mapInputsView(args: {
  entries: ReadonlyArray<CollectionEntry<"inputs">>;
  citationsBySlug?: ReadonlyMap<string, number>;
}): InputsView {
  const sorted = [...args.entries].sort(
    (a, b) => safeDate(b.data.consumed) - safeDate(a.data.consumed),
  );

  const inputs: InputRow[] = sorted.map((entry) => {
    const consumedIso = entry.data.consumed;
    return {
      slug: entry.id,
      title: entry.data.title,
      by: entry.data.source ?? "—",
      kind: inputKind(entry),
      year: consumedIso.slice(0, 4),
      date: formatDate(entry.data.consumed),
      influence: args.citationsBySlug?.get(entry.id) ?? 0,
      note: entry.data.note ?? "—",
      href: detailHref("inputs", entry.id),
    };
  });

  const totalCitations = inputs.reduce((sum, row) => sum + row.influence, 0);
  const mostCited = [...inputs].sort((a, b) => b.influence - a.influence)[0];

  const stats: IndexStat[] = [
    { label: "On file", value: String(inputs.length), sub: "citable inputs" },
    {
      label: "Total citations",
      value: String(totalCitations),
      sub: "downstream from these inputs",
    },
    { label: "Most-cited", value: mostCited?.year ?? "—", sub: "leading vintage" },
  ];

  return { total: inputs.length, stats, inputs };
}

/** Build the input detail view from one entry plus optional citation rows resolved from the citing kinds. */
export function mapInputDetail(args: {
  entry: CollectionEntry<"inputs">;
  citations?: ReadonlyArray<{
    kind: string;
    title: string;
    href?: string;
    conf?: number;
    date?: string;
  }>;
}): InputDetail {
  const { entry } = args;
  const consumedIso = entry.data.consumed;
  return {
    slug: entry.id,
    title: entry.data.title,
    ...(entry.data.url !== undefined ? { url: entry.data.url } : {}),
    by: entry.data.source ?? "—",
    kind: inputKind(entry),
    year: consumedIso.slice(0, 4),
    publisher: entry.data.source ?? "—",
    read: formatDate(entry.data.consumed),
    reread: [],
    takeaway: entry.data.note ?? "Notes pending.",
    oneLine: entry.data.note ? (entry.data.note.split(/[.!?]/)[0] ?? "") : "",
    citations: (args.citations ?? []).map((c) => ({
      kind: c.kind,
      title: c.title,
      ...(c.href !== undefined ? { href: c.href } : {}),
      ...(c.conf !== undefined ? { conf: c.conf } : {}),
      ...(c.date !== undefined ? { date: c.date } : {}),
    })),
    marginNotes: [],
  };
}
