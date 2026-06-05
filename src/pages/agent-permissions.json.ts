import type { APIRoute } from "astro";

/** Pre-render the public automated-access policy as a static JSON file. */
export const prerender = true;

const permissions = {
  version: "0.1",
  site: "https://thinkinglabs.run",
  policy: "public-read",
  automated_access: {
    read_public_pages: true,
    read_markdown_variants: true,
    read_json_apis: true,
    use_mcp_endpoint: true,
    submit_questions: true,
    send_contact_messages: false,
    train_models: false,
  },
  preferred_entrypoints: [
    "/llms.txt",
    "/agents",
    "/skill.md",
    "/api/<kind>.json",
    "https://mcp.thinkinglabs.run/mcp",
  ],
  rate_limits: {
    guidance:
      "Be polite. Prefer llms.txt, Markdown variants, JSON APIs, feeds, or MCP over crawling HTML.",
    mcp_http_default: "30 request burst, then roughly 1 request per second per IP.",
  },
  contact: {
    human_surface: "/contact",
    structured_surface: "/contact.json",
    mcp_precheck_tool: "contact.precheck",
  },
} as const;

/** Return the automated-access policy and preferred machine-readable entrypoints. */
export const GET: APIRoute = () =>
  new Response(`${JSON.stringify(permissions, null, 2)}\n`, {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
