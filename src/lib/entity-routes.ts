import type { Kind } from "../schemas/index.ts";
import { KIND_REGISTRY } from "./registry.ts";

/** Resolve the public listing route for a kind that is exposed on the site. */
export function listingHref(kind: Kind): string {
  const route = KIND_REGISTRY[kind].route;
  if (!route) throw new Error(`kind "${kind}" does not have a public route`);
  return route;
}

/** Resolve the public detail route for a content entry under its registered listing route. */
export function detailHref(kind: Kind, slug: string): string {
  const normalizedSlug = slug.replace(/^\/+/, "");
  return `${listingHref(kind)}/${normalizedSlug}`;
}

/** Format an ISO date or Date for display; returns the YYYY-MM-DD prefix used across listings. */
export function formatDate(d: Date | string): string {
  const iso = typeof d === "string" ? d : d.toISOString();
  return iso.slice(0, 10);
}
