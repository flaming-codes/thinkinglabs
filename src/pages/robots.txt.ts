import type { APIRoute } from "astro";
import { sitemapUrl } from "../lib/seo.ts";

/** Emit robots.txt as a static build artifact for local production deploys. */
export const prerender = true;

/** Allow crawling and advertise the generated sitemap location. */
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("https://thinkinglabs.run");
  return new Response(
    [
      "User-agent: *",
      "Allow: /",
      "",
      "User-agent: GPTBot",
      "Allow: /",
      "",
      "User-agent: ClaudeBot",
      "Allow: /",
      "",
      "User-agent: PerplexityBot",
      "Allow: /",
      "",
      "User-agent: Applebot-Extended",
      "Disallow: /",
      "",
      "User-agent: Google-Extended",
      "Disallow: /",
      "",
      "User-agent: Amazonbot",
      "Allow: /",
      "",
      "User-agent: cohere-ai",
      "Allow: /",
      "",
      "User-agent: OAI-SearchBot",
      "Allow: /",
      "",
      `Sitemap: ${sitemapUrl(base)}`,
      `LLMs: ${new URL("/llms.txt", base).href}`,
      `LLMs-Full: ${new URL("/llms-full.txt", base).href}`,
      "MCP: https://mcp.thinkinglabs.run/mcp",
      `MCP-Server-Card: ${new URL("/.well-known/mcp.json", base).href}`,
      `Skill: ${new URL("/skill.md", base).href}`,
      `Agent-Permissions: ${new URL("/agent-permissions.json", base).href}`,
      "",
    ].join("\n"),
    {
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    },
  );
};
