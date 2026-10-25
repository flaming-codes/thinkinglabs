import { describe, expect, it } from "vite-plus/test";
import { GET as getRobots } from "../src/pages/robots.txt.ts";
import { GET as getPermissions } from "../src/pages/agent-permissions.json.ts";

describe("robots.txt route", () => {
  it("emits expected crawler directives and machine discovery headers", async () => {
    const res = await (getRobots as any)({ site: new URL("https://thinkinglabs.run") });
    expect(res.status).toBe(200);
    const body = await res.text();

    expect(body).toContain("User-agent: *");
    expect(body).toContain("User-agent: GPTBot\nAllow: /");
    expect(body).toContain("User-agent: ClaudeBot\nAllow: /");
    expect(body).toContain("User-agent: PerplexityBot\nAllow: /");
    expect(body).toContain("User-agent: Applebot-Extended\nAllow: /");
    expect(body).toContain("User-agent: Google-Extended\nAllow: /");

    expect(body).toContain("Sitemap: https://thinkinglabs.run/sitemap.xml");
    expect(body).toContain("LLMs: https://thinkinglabs.run/llms.txt");
    expect(body).toContain("LLMs-Full: https://thinkinglabs.run/llms-full.txt");
    expect(body).toContain("MCP: https://mcp.thinkinglabs.run/mcp");
    expect(body).toContain("MCP-Server-Card: https://thinkinglabs.run/.well-known/mcp.json");
    expect(body).toContain("Skill: https://thinkinglabs.run/skill.md");
    expect(body).toContain("Agent-Permissions: https://thinkinglabs.run/agent-permissions.json");
  });

  it("permits AI training in automated-access policy", async () => {
    const res = await (getPermissions as any)({ site: new URL("https://thinkinglabs.run") });
    expect(res.status).toBe(200);
    const json = JSON.parse(await res.text());
    expect(json.automated_access.train_models).toBe(true);
  });
});
