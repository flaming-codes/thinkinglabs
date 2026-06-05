import type { CollectionEntry } from "astro:content";
import type {
  ClaimDetail,
  ClaimEvidence,
  ClaimSummary,
} from "../../frontend/thinkinglabs-ui/types.ts";
import type { ClaimHistoryEntry } from "../claim-history.ts";
import { detailHref, formatDate } from "../entity-routes.ts";
import { stripKindPrefix, stripMdExt } from "../refs.ts";
import { markdownParagraphs } from "./text.ts";
import { kindLabel, safeDate, type TitleLookup, titleFromLookup } from "./ref-lookups.ts";

/** Convert claims entries into listing rows expected by the shared claims composition. */
export function mapClaimSummaries(
  claims: ReadonlyArray<CollectionEntry<"claims">>,
): ClaimSummary[] {
  return [...claims]
    .sort((a, b) => safeDate(b.data.last_reviewed) - safeDate(a.data.last_reviewed))
    .map((claim) => ({
      id: claim.id,
      title: claim.data.claim,
      conf: claim.data.confidence,
      prev: null,
      status: claim.data.status,
      reviewed: formatDate(claim.data.last_reviewed),
      evidence: claim.data.evidence.length,
      opposing: claim.data.opposing.length,
      tags: claim.data.tags,
      href: detailHref("claims", claim.id),
    }));
}

/** Convert one claim entry plus git-derived history into the shared claim-detail composition shape. */
export function mapClaimDetail(args: {
  entry: CollectionEntry<"claims">;
  history: ReadonlyArray<ClaimHistoryEntry>;
  lookups?: TitleLookup;
}): ClaimDetail {
  const { entry, history, lookups = {} } = args;
  const evidenceRefs: ClaimEvidence[] = entry.data.derived_from.map((ref) => {
    const resolved = titleFromLookup(ref, "thoughts", lookups);
    return {
      kind: kindLabel(resolved.kind),
      title: resolved.title,
      id: `${resolved.kind}/${stripKindPrefix(stripMdExt(ref))}`,
      href: resolved.href,
    };
  });

  const evidenceLinks: ClaimEvidence[] = entry.data.evidence.map((source, index) => ({
    kind: "source",
    title: source.note ?? source.url ?? `Evidence ${index + 1}`,
    id: source.url ?? `${entry.id}#evidence-${index + 1}`,
    ...(source.url ? { href: source.url } : {}),
  }));

  const opposing: ClaimEvidence[] = entry.data.opposing.map((text, index) => ({
    kind: "opposing",
    title: text,
    id: `${entry.id}#opposing-${index + 1}`,
  }));

  const mappedHistory =
    history.length > 0
      ? history.map((item) => ({
          date: formatDate(item.isoDate),
          conf: item.confidence,
          note: `status ${item.status}`,
        }))
      : [
          {
            date: formatDate(entry.data.last_reviewed),
            conf: entry.data.confidence,
            note: "current version",
          },
        ];

  const paragraphs = markdownParagraphs(entry.body ?? "");

  return {
    id: `claims/${entry.id}`,
    title: entry.data.claim,
    conf: entry.data.confidence,
    reviewed: formatDate(entry.data.last_reviewed),
    status: entry.data.status,
    tags: entry.data.tags,
    body: paragraphs.length > 0 ? paragraphs : [entry.data.claim],
    evidence: [...evidenceRefs, ...evidenceLinks],
    opposing,
    history: mappedHistory,
  };
}
