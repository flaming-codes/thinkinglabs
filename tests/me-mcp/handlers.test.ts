import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeIndex, collectObjects } from "../../src/index/builder.ts";
import { handleContactPrecheck, handleContactSend, handleQueryView, handleSubscribeBrainDiff } from "../../servers/me-mcp/handlers.ts";
import { createMeMcpServer } from "../../servers/me-mcp/server.ts";

let root: string;

function writeMd(kind: string, slug: string, frontmatter: string, body: string): void {
  const dir = join(root, "content", kind);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${slug}.md`), `---\n${frontmatter}---\n\n${body}\n`, "utf8");
}

function writeContact(): void {
  mkdirSync(join(root, "public"), { recursive: true });
  writeFileSync(join(root, "public", "contact.json"), JSON.stringify({
    same_day_reply: ["paid advisory inquiries on AI / MCP / agent infrastructure"],
    queued: ["collaboration proposals tied to a concrete artifact"],
    decline: ["recruitment", "generic 'pick your brain' meetings"],
    advisory_rate: { currency: "EUR", hourly: "350", min_engagement: "2 hours" },
    fastest_no: "Reply with intent: decline-check.",
    channels: [{ type: "email", address: "tom@example.com" }],
    languages: ["en", "de"],
  }));
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "me-mcp-"));
  writeContact();
  writeMd("thoughts", "mcp-notes", 'title: "MCP Notes"\ncreated: "2026-04-01"\nupdated: "2026-04-02"\ntags: ["mcp"]\nclaims: []\ninputs: []\n', "MCP makes local context queryable.");
  writeMd("projects", "agent-workbench", 'title: "Agent Workbench"\nstatus: "alive"\nstarted: "2026-04-01"\ncurrent_question: "How should agents query memory?"\nlinks: {}\nrelated_thoughts: []\nrelated_claims: []\ntags: ["agents"]\n', "Current work.");
  writeMd("projects", "old-tool", 'title: "Old Tool"\nstatus: "dormant"\nstarted: "2025-01-01"\nlinks: {}\nrelated_thoughts: []\nrelated_claims: []\ntags: []\n', "Parked.");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("me-mcp handlers", () => {
  it("queries source-backed public views", () => {
    const result = handleQueryView({ repoRoot: root }, { view: "thoughts", query: "local context", limit: 5 });
    const data = result.structuredContent as { source: string; count: number; items: Array<{ title: string }> };
    expect(data.source).toBe("source");
    expect(data.count).toBe(1);
    expect(data.items[0]?.title).toBe("MCP Notes");
  });

  it("queries sqlite-backed public views when the index exists", () => {
    mkdirSync(join(root, "dist"), { recursive: true });
    writeIndex(collectObjects(join(root, "content"), root), join(root, "dist", "index.sqlite"));
    const result = handleQueryView({ repoRoot: root }, { view: "current_focus", limit: 10 });
    const data = result.structuredContent as { source: string; count: number; items: Array<{ slug: string }> };
    expect(data.source).toBe("sqlite");
    expect(data.items.map((item) => item.slug)).toEqual(["agent-workbench"]);
  });

  it("prechecks contact intent against public policy", () => {
    const result = handleContactPrecheck({ repoRoot: root }, { intent: "Recruitment opportunity", message: "Can we discuss a role?" });
    expect(result.isError).toBeUndefined();
    expect((result.structuredContent as { verdict: string }).verdict).toBe("decline");
  });

  it("marks declined contact send as not accepted", () => {
    const result = handleContactSend({ repoRoot: root }, { from: "a@example.com", subject: "Podcast", intent: "generic pick your brain meeting", message: "Can we chat?" });
    const data = result.structuredContent as { accepted: boolean; sent: boolean; to: string | null };
    expect(result.isError).toBe(true);
    expect(data.accepted).toBe(false);
    expect(data.sent).toBe(false);
    expect(data.to).toBe("tom@example.com");
  });

  it("returns brain-diff subscription feeds without requiring git history", () => {
    const result = handleSubscribeBrainDiff({ repoRoot: root }, { since: "HEAD~1", include_recent: false, site_url: "https://example.com" });
    const data = result.structuredContent as { subscribed: boolean; feeds: { json: string } };
    expect(data.subscribed).toBe(true);
    expect(data.feeds.json).toBe("https://example.com/feed/brain-diff.json");
  });

  it("registers MCP resources and tools through the official SDK", async () => {
    const server = createMeMcpServer({ repoRoot: root });
    const client = new Client({ name: "test-client", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const resources = await client.listResources();
      const tools = await client.listTools();
      const thoughts = await client.readResource({ uri: "me://thoughts" });
      expect(resources.resources.map((resource) => resource.uri)).toEqual([
        "me://thoughts",
        "me://claims",
        "me://projects",
        "me://decisions",
        "me://predictions",
        "me://inputs",
        "me://current_focus",
      ]);
      expect(tools.tools.map((tool) => tool.name).sort()).toEqual(["contact.precheck", "contact.send", "query_view", "subscribe_brain_diff"]);
      const first = thoughts.contents[0];
      expect(first && "text" in first ? first.text : "").toContain("MCP Notes");
    } finally {
      await client.close();
      await server.close();
    }
  });
});
