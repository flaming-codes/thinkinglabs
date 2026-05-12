import type { APIRoute, GetStaticPaths } from "astro";
import { getMarkdownStaticPaths, markdownResponseForSlug } from "../lib/markdown-routes.ts";

/** Pre-render every public Markdown URL variant into the static build. */
export const prerender = true;

/** Enumerate Markdown siblings for public HTML pages. */
export const getStaticPaths = (async () => {
  return getMarkdownStaticPaths();
}) satisfies GetStaticPaths;

/** Serve one contract-validated Markdown page variant. */
export const GET: APIRoute = async ({ params }) => {
  return markdownResponseForSlug(params.slug);
};
