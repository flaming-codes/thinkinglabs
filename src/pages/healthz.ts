import type { APIRoute } from "astro";

/** Emit a tiny static health endpoint for platform load balancers. */
export const prerender = true;

/** Return a successful liveness response without touching content or derived artifacts. */
export const GET: APIRoute = () =>
  new Response("ok\n", {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
