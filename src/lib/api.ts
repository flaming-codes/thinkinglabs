import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import type { CollectionEntry, CollectionKey } from "astro:content";
import type { Kind } from "../schemas/index.ts";
import { KIND_REGISTRY } from "./registry.ts";

/** Runtime gate for public collection APIs; denies by default for non-public kinds. */
function isPublicApiKind(kind: CollectionKey): kind is Kind {
  return kind in KIND_REGISTRY && KIND_REGISTRY[kind as Kind].api;
}

/** Generic JSON endpoint factory; one shared shape for every collection so per-kind handlers stay one-liners. */
export function collectionJson<K extends CollectionKey>(kind: K): APIRoute {
  return async () => {
    if (!isPublicApiKind(kind)) return new Response(null, { status: 404 });
    const entries: ReadonlyArray<CollectionEntry<K>> = await getCollection(kind);
    const body = entries.map((e) => ({ id: e.id, data: e.data, body: e.body ?? "" }));
    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        /* Design-intent only: static hosting sets cache headers today; this applies again under SSR or origin pass-through. */
        "cache-control": "public, max-age=300, stale-while-revalidate=86400",
        "content-type": "application/json; charset=utf-8",
      },
    });
  };
}
