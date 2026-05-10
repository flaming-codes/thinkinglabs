import { canonicalUrl } from "./structured-data.ts";
import { SITE_NAME } from "./site.ts";

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

const TITLE_SEPARATOR = " | ";
const LEGACY_TITLE_SUFFIX = /\s+(?:[-–—]\s*)?(?:Tom(?:\s+Wild)?|thinkinglabs)$/i;
const LEGACY_TITLE_PREFIX = /^Tom(?:\s+Wild)?\s*[-–—]\s*/i;

/** Format page metadata titles as "<page> | thinkinglabs" without legacy personal-name copy. */
export function metadataTitle(pageTitle: string): string {
  const page = pageTitle
    .trim()
    .replace(LEGACY_TITLE_PREFIX, "")
    .replace(LEGACY_TITLE_SUFFIX, "")
    .replace(/\s+[–—]\s+/g, " - ")
    .trim();

  return page.length > 0 && page.toLowerCase() !== SITE_NAME
    ? `${page}${TITLE_SEPARATOR}${SITE_NAME}`
    : SITE_NAME;
}

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

/** Resolve the canonical square logo URL for metadata consumers that support it. */
export function logoUrl(site: string | URL): string {
  return canonicalUrl("/maskable-icon-512x512.png", site);
}

/** Resolve the canonical sitemap URL for robots.txt and crawler metadata. */
export function sitemapUrl(site: string | URL): string {
  return canonicalUrl("/sitemap.xml", site);
}
