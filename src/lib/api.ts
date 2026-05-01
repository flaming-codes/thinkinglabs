import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import type { CollectionEntry, CollectionKey } from "astro:content";

/** Generic JSON endpoint factory; one shared shape for every collection so per-kind handlers stay one-liners. */
export function collectionJson<K extends CollectionKey>(kind: K): APIRoute {
  return async () => {
    const entries: ReadonlyArray<CollectionEntry<K>> = await getCollection(kind);
    const body = entries.map((e) => ({ id: e.id, data: e.data, body: e.body ?? "" }));
    return new Response(JSON.stringify(body, null, 2), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  };
}
