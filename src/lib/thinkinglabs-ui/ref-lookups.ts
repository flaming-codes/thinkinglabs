import type { CollectionEntry } from "astro:content";
import type { DetailRelation } from "../../frontend/thinkinglabs-ui/types.ts";
import type { Kind } from "../../schemas/index.ts";
import { KINDS } from "../../schemas/index.ts";
import { detailHref } from "../entity-routes.ts";
import { titleFor } from "../registry.ts";
import { stripKindPrefix, stripMdExt } from "../refs.ts";

/** Per-kind entry counts keyed by kind slug. */
export type CountByKind = Partial<Record<Kind, number>>;
/** Per-kind slug-to-title maps used to resolve cross-kind references. */
export type TitleLookup = Partial<Record<Kind, ReadonlyMap<string, string>>>;
/** Claims indexed by slug so mappers can enrich links with live confidence values. */
export type ClaimLookup = ReadonlyMap<string, CollectionEntry<"claims">>;

const KIND_SET = new Set<Kind>(KINDS);

/** Parse the millisecond timestamp from a date value, returning zero for missing or invalid input. */
export function safeDate(value: Date | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const iso = typeof value === "string" ? value : value.toISOString();
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Derive a singular human label from a kind slug. */
export function kindLabel(kind: string): string {
  const spaced = kind.replace(/-/g, " ");
  if (spaced.endsWith("s")) return spaced.slice(0, -1);
  return spaced;
}

/** Resolve a content reference into its kind, slug, and detail href. */
export function parseRef(
  ref: string,
  fallbackKind: Kind,
): { kind: Kind; slug: string; href: string } {
  const withoutAnchor = ref.split("#")[0] ?? ref;
  const normalized = stripMdExt(withoutAnchor);
  const [maybeKind, ...rest] = normalized.split("/");

  if (maybeKind !== undefined && KIND_SET.has(maybeKind as Kind) && rest.length > 0) {
    const kind = maybeKind as Kind;
    const slug = rest.join("/");
    return { kind, slug, href: detailHref(kind, slug) };
  }

  const slug = stripKindPrefix(normalized);
  return { kind: fallbackKind, slug, href: detailHref(fallbackKind, slug) };
}

/** Resolve a reference to its display title via the per-kind title lookup, falling back to the slug. */
export function titleFromLookup(
  ref: string,
  fallbackKind: Kind,
  lookups: TitleLookup,
): { kind: Kind; title: string; href: string } {
  const parsed = parseRef(ref, fallbackKind);
  const title = lookups[parsed.kind]?.get(parsed.slug) ?? parsed.slug;
  return { kind: parsed.kind, title, href: parsed.href };
}

/** Resolve a reference against multiple candidate kinds, preferring the first that has a known title. */
export function titleFromLookupCandidates(
  ref: string,
  fallbackKinds: readonly Kind[],
  lookups: TitleLookup,
): { kind: Kind; title: string; href: string } {
  const withoutAnchor = ref.split("#")[0] ?? ref;
  const normalized = stripMdExt(withoutAnchor);
  const [maybeKind, ...rest] = normalized.split("/");

  if (maybeKind !== undefined && KIND_SET.has(maybeKind as Kind) && rest.length > 0) {
    return titleFromLookup(ref, maybeKind as Kind, lookups);
  }

  const slug = stripKindPrefix(normalized);
  for (const kind of fallbackKinds) {
    const title = lookups[kind]?.get(slug);
    if (title !== undefined) return { kind, title, href: detailHref(kind, slug) };
  }

  const fallbackKind = fallbackKinds[0] ?? "thoughts";
  return { kind: fallbackKind, title: slug, href: detailHref(fallbackKind, slug) };
}

/** Resolve a reference into the shared detail-relation shape used across detail views. */
export function detailRelation(
  ref: string,
  fallbackKind: Kind,
  lookups: TitleLookup,
): DetailRelation {
  const resolved = titleFromLookup(ref, fallbackKind, lookups);
  return {
    kind: kindLabel(resolved.kind),
    title: resolved.title,
    href: resolved.href,
  };
}

/** Look up the live confidence of a referenced claim, or undefined when it is unknown. */
export function relatedClaimConfidence(claimLookup: ClaimLookup, ref: string): number | undefined {
  const parsed = parseRef(ref, "claims");
  const claim = claimLookup.get(parsed.slug);
  return claim?.data.confidence;
}

/** Build per-kind title maps used to resolve cross-kind references into UI labels and links. */
export function buildTitleLookup(
  entriesByKind: Partial<Record<Kind, ReadonlyArray<CollectionEntry<Kind>>>>,
): TitleLookup {
  const lookup: TitleLookup = {};
  for (const kind of KINDS) {
    const entries = entriesByKind[kind];
    if (!entries || entries.length === 0) continue;
    const bySlug = new Map<string, string>();
    for (const entry of entries) {
      bySlug.set(entry.id, titleFor(kind, entry.data, entry.id));
    }
    lookup[kind] = bySlug;
  }
  return lookup;
}

/** Index claims by slug so related-reference mappers can enrich links with live confidence values. */
export function buildClaimLookup(claims: ReadonlyArray<CollectionEntry<"claims">>): ClaimLookup {
  return new Map(claims.map((claim) => [claim.id, claim]));
}
