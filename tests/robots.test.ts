import { describe, expect, it } from "vite-plus/test";
import { GET } from "../src/pages/robots.txt.ts";

describe("robots.txt route", () => {
  it("emits expected crawler directives and machine discovery headers", async () => {
    const res = await (GET as any)({ site: new URL("https://thinkinglabs.run") });
    expect(res.status).toBe(200);
    const body = await res.text();

    expect(body).toContain("User-agent: *");
    expect(body).toContain("User-agent: GPTBot\nAllow: /");
    expect(body).toContain("User-agent: ClaudeBot\nAllow: /");
    expect(body).toContain("User-agent: PerplexityBot\nAllow: /");
    expect(body).toContain("User-agent: Applebot-Extended\nDisallow: /");
    expect(body).toContain("User-agent: Google-Extended\nDisallow: /");

    expect(body).toContain("Sitemap: https://thinkinglabs.run/sitemap.xml");
    expect(body).toContain("LLMs: https://thinkinglabs.run/llms.txt");
    expect(body).toContain("LLMs-Full: https://thinkinglabs.run/llms-full.txt");
    expect(body).toContain("MCP: https://mcp.thinkinglabs.run/mcp");
    expect(body).toContain("MCP-Server-Card: https://thinkinglabs.run/.well-known/mcp.json");
    expect(body).toContain("Skill: https://thinkinglabs.run/skill.md");
    expect(body).toContain("Agent-Permissions: https://thinkinglabs.run/agent-permissions.json");
  });
});
