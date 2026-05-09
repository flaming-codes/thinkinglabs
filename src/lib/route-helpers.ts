import { getCollection, type CollectionEntry } from "astro:content";
import type { Kind } from "../schemas/index.ts";
export { detailHref, formatDate, listingHref } from "./entity-routes.ts";

/** Return shape for a single kind-detail static path; preserves the typed `entry` so Astro pages keep `data` inference. */
export interface KindStaticPath<K extends Kind> {
  readonly params: { readonly slug: string };
  readonly props: { readonly entry: CollectionEntry<K> };
}

/** Astro-shaped static paths derived from a collection; each kind detail page reduces to one call without losing `entry.data` types. */
export async function getKindStaticPaths<K extends Kind>(kind: K): Promise<KindStaticPath<K>[]> {
  const items = await getCollection(kind);
  return items.map((entry: CollectionEntry<K>) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
}
