import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { APIRoute } from "astro";

/** Pre-render the public capability-signaling skill file as static Markdown. */
export const prerender = true;

/** Serve the Harness-managed thinkinglabs skill source as the public `/skill.md` surface. */
export const GET: APIRoute = () => {
  const body = readFileSync(
    resolve(process.cwd(), ".harness/src/skills/thinkinglabs/SKILL.md"),
    "utf8",
  );
  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
};
