import { canonicalUrl } from "./structured-data.ts";

/** One HTML feed-discovery link emitted by every layout. */
export interface FeedLink {
  readonly title: string;
  readonly href: string;
  readonly type: "application/feed+json";
}

/** Build-time deterministic feeds that always exist after `pnpm build`. */
export const DEFAULT_FEED_LINKS: ReadonlyArray<FeedLink> = [
  {
    title: "Predictions resolved",
    href: "/feed/predictions-resolved.json",
    type: "application/feed+json",
  },
  {
    title: "Claims revised",
    href: "/feed/claims-revised.json",
    type: "application/feed+json",
  },
  {
    title: "Decisions reversed",
    href: "/feed/decisions-reversed.json",
    type: "application/feed+json",
  },
];

/** Convert feed links to absolute URLs under the configured public site URL. */
export function absoluteFeedLinks(site: string | URL): ReadonlyArray<FeedLink> {
  return DEFAULT_FEED_LINKS.map((feed) => ({
    ...feed,
    href: canonicalUrl(feed.href, site),
  }));
}

/** Resolve the generated Open Graph image URL for a rendered page path. */
export function ogImageUrl(pathname: string, site: string | URL): string {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const slug = normalized === "/" ? "index" : normalized.replace(/^\//, "");
  return canonicalUrl(`/og/${slug}.png`, site);
}

/** Resolve the canonical sitemap URL for robots.txt and crawler metadata. */
export function sitemapUrl(site: string | URL): string {
  return canonicalUrl("/sitemap.xml", site);
}
