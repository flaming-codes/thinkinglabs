import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { KIND_REGISTRY, LISTING_KINDS } from "../lib/registry.ts";
import { canonicalUrl } from "../lib/structured-data.ts";
import type { Kind } from "../schemas/index.ts";

/** Emit sitemap.xml during the static build so local deploys include crawler discovery. */
export const prerender = true;

interface SitemapEntry {
  readonly url: string;
  readonly lastmod?: string;
}

const STATIC_HTML_PATHS = [
  "/",
  "/now",
  "/about",
  "/agents",
  "/contact",
  "/brain-diff",
  "/graph",
  "/predictions/calibration",
] as const;

/** Build a sitemap from fixed HTML pages, public listing pages, and present content entries. */
export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL("https://thinkinglabs.run");
  const entries: SitemapEntry[] = [
    ...STATIC_HTML_PATHS.map((path) => ({ url: canonicalUrl(path, base) })),
    ...LISTING_KINDS.map((kind) => ({ url: canonicalUrl(KIND_REGISTRY[kind].route ?? "/", base) })),
  ];

  for (const kind of LISTING_KINDS) {
    const route = KIND_REGISTRY[kind].route;
    if (!route) continue;
    const collection = await getKindCollection(kind);
    const dateField = KIND_REGISTRY[kind].dateField;
    for (const entry of collection) {
      const data = entry.data as Record<string, unknown>;
      const lastmod = typeof data[dateField] === "string" ? data[dateField] : undefined;
      const sitemapEntry: SitemapEntry = { url: canonicalUrl(`${route}/${entry.id}`, base) };
      if (lastmod) entries.push({ ...sitemapEntry, lastmod });
      else entries.push(sitemapEntry);
    }
  }

  return new Response(renderSitemap(entries), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
    },
  });
};

async function getKindCollection(kind: Kind) {
  switch (kind) {
    case "thoughts":
      return getCollection("thoughts");
    case "claims":
      return getCollection("claims");
    case "projects":
      return getCollection("projects");
    case "predictions":
      return getCollection("predictions");
    case "changed-my-mind":
      return getCollection("changed-my-mind");
    case "decisions":
      return getCollection("decisions");
    case "questions":
      return getCollection("questions");
    case "posts":
      return getCollection("posts");
    case "inputs":
      return getCollection("inputs");
    case "provenance":
      return getCollection("provenance");
  }
}

function renderSitemap(entries: ReadonlyArray<SitemapEntry>): string {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(entry.url)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
