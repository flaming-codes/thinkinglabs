import type { APIRoute, GetStaticPaths } from "astro";
import { embeddedTools, findEmbeddedTool } from "../../../../embeds/index.ts";

/** Embed payloads are static artifacts generated at build time. */
export const prerender = true;

/** Generates one JSON path for each registered embedded scoped agent. */
export const getStaticPaths: GetStaticPaths = () =>
  embeddedTools.map((tool) => ({ params: { id: tool.contract.id } }));

/** Returns the public static JSON payload for one embedded scoped agent. */
export const GET: APIRoute = ({ params }) => {
  const tool = findEmbeddedTool(params.id ?? "");
  if (!tool) {
    return new Response(JSON.stringify({ error: "embed not found" }), {
      status: 404,
      headers: {
        "cache-control": "public, max-age=300, stale-while-revalidate=86400",
        "content-type": "application/json; charset=utf-8",
      },
    });
  }
  return new Response(JSON.stringify(tool, null, 2), {
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=86400",
      "content-type": "application/json; charset=utf-8",
    },
  });
};
