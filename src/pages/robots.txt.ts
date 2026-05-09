import type { APIRoute } from "astro";
import { sitemapUrl } from "../lib/seo.ts";

/** Emit robots.txt as a static build artifact for local production deploys. */
export const prerender = true;

/** Allow crawling and advertise the generated sitemap location. */
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("https://thinkinglabs.run");
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl(base)}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
};
