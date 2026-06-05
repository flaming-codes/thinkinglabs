import type { CollectionEntry } from "astro:content";
import type {
  PostDetail,
  PostInput,
  PostRelated,
  PostSummary,
} from "../../frontend/thinkinglabs-ui/types.ts";
import { detailHref, formatDate } from "../entity-routes.ts";
import { buildSections, extractEpigraph, extractFootnotes } from "./post-sections.ts";
import { firstParagraph, minutesForWords, truncate, wordCount } from "./text.ts";
import {
  type ClaimLookup,
  kindLabel,
  parseRef,
  relatedClaimConfidence,
  safeDate,
  type TitleLookup,
  titleFromLookup,
} from "./ref-lookups.ts";

function postTopic(tags: readonly string[]): string {
  const [first] = tags;
  return first ?? "general";
}

/** Convert post entries into listing rows with derived deck, topic, and reading-time metadata. */
export function mapPostSummaries(posts: ReadonlyArray<CollectionEntry<"posts">>): PostSummary[] {
  const sorted = [...posts].sort((a, b) => safeDate(b.data.updated) - safeDate(a.data.updated));
  return sorted.map((post, index) => {
    const words = wordCount(post.body ?? "");
    return {
      slug: post.id,
      title: post.data.title,
      deck: post.data.summary ?? truncate(firstParagraph(post.body ?? "", post.data.title), 220),
      date: formatDate(post.data.created),
      minutes: minutesForWords(words),
      words,
      topic: postTopic(post.data.tags),
      ...(index === 0 ? { featured: true } : {}),
      href: detailHref("posts", post.id),
    };
  });
}

/** Convert one post entry plus lookup data into the shared post-detail composition shape. */
export function mapPostDetail(args: {
  entry: CollectionEntry<"posts">;
  lookups?: TitleLookup;
  claimLookup?: ClaimLookup;
  inputLookup?: ReadonlyMap<string, CollectionEntry<"inputs">>;
}): PostDetail {
  const { entry, lookups = {}, claimLookup = new Map(), inputLookup = new Map() } = args;
  const words = wordCount(entry.body ?? "");
  const deck =
    entry.data.summary ?? truncate(firstParagraph(entry.body ?? "", entry.data.title), 280);
  const related: PostRelated[] = [
    ...entry.data.related_claims.map((ref) => {
      const resolved = titleFromLookup(ref, "claims", lookups);
      const conf = relatedClaimConfidence(claimLookup, ref);
      return {
        kind: kindLabel(resolved.kind),
        title: resolved.title,
        ...(conf !== undefined ? { conf } : {}),
        href: resolved.href,
      };
    }),
    ...entry.data.related_thoughts.map((ref) => {
      const resolved = titleFromLookup(ref, "thoughts", lookups);
      return {
        kind: kindLabel(resolved.kind),
        title: resolved.title,
        href: resolved.href,
      };
    }),
  ];
  const inputs: PostInput[] = entry.data.inputs.map((ref) => {
    const resolved = titleFromLookup(ref, "inputs", lookups);
    const parsed = parseRef(ref, "inputs");
    const input = inputLookup.get(parsed.slug);
    return {
      title: resolved.title,
      source: input?.data.source ?? "input",
      note: input?.data.note ?? "",
      consumed: input ? formatDate(input.data.consumed) : "",
      href: resolved.href,
      ...(input?.data.url !== undefined ? { externalHref: input.data.url } : {}),
    };
  });

  const sections = buildSections(entry.body ?? "");
  const footnotes = extractFootnotes(entry.body ?? "");

  return {
    slug: entry.id,
    title: entry.data.title,
    deck,
    epigraph: extractEpigraph(entry.body ?? "", deck),
    date: formatDate(entry.data.created),
    updated: formatDate(entry.data.updated),
    minutes: minutesForWords(words),
    words,
    topic: postTopic(entry.data.tags),
    license: "See repository LICENSE",
    citation: `Tom, ${entry.data.title}, thinkinglabs, ${formatDate(entry.data.created)}.`,
    backlinks: related.length,
    related,
    inputs,
    sections: sections.length > 0 ? sections : [{ number: "01", title: "Overview", blocks: [] }],
    footnotes,
  };
}
