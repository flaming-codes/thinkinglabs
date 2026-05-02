import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { writeIndex, collectObjects } from "../../src/index/builder.ts";
import {
  handleContactPrecheck,
  handleContactSend,
  handleQueryView,
  handleQuestionSubmit,
  handleSubscribeBrainDiff,
} from "../../servers/thinkinglabs-mcp/handlers.ts";
import { createThinkinglabsMcpServer } from "../../servers/thinkinglabs-mcp/server.ts";
import { getObject } from "../../servers/thinkinglabs-mcp/store.ts";

let root: string;

function writeMd(kind: string, slug: string, frontmatter: string, body: string): string {
  const dir = join(root, "content", kind);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${slug}.md`);
  writeFileSync(file, `---\n${frontmatter}---\n\n${body}\n`, "utf8");
  return file;
}

function writeContact(): void {
  mkdirSync(join(root, "public"), { recursive: true });
  writeFileSync(
    join(root, "public", "contact.json"),
    JSON.stringify({
      same_day_reply: ["paid advisory inquiries on AI / MCP / agent infrastructure"],
      queued: ["collaboration proposals tied to a concrete artifact"],
      decline: ["recruitment", "generic 'pick your brain' meetings"],
      advisory_rate: { currency: "EUR", hourly: "350", min_engagement: "2 hours" },
      fastest_no: "Reply with intent: decline-check.",
      channels: [{ type: "email", address: "tom@example.com" }],
      languages: ["en", "de"],
    }),
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "thinkinglabs-mcp-"));
  writeContact();
  writeMd(
    "thoughts",
    "mcp-notes",
    'title: "MCP Notes"\ncreated: "2026-04-01"\nupdated: "2026-04-02"\ntags: ["mcp"]\nclaims: []\ninputs: []\n',
    "MCP makes local context queryable.",
  );
  writeMd(
    "claims",
    "mcp-claim",
    'claim: "MCP makes personal context reusable."\nconfidence: 0.7\nlast_reviewed: "2026-04-02"\ntags: ["mcp"]\nevidence: []\nopposing: []\nderived_from: ["thoughts/mcp-notes"]\nstatus: active\nsupersedes: []\nsuperseded_by: []\n',
    "Claim body.",
  );
  writeMd(
    "predictions",
    "mcp-prediction",
    'prediction: "MCP support grows."\nmade: "2026-01-01"\nresolves: "2026-02-01"\nconfidence: 0.8\nresolution: "true"\nresolved_on: "2026-02-02"\nresolution_note: "It did."\nevidence_at_time: []\ntags: ["mcp"]\n',
    "Prediction body.",
  );
  writeMd(
    "questions",
    "mcp-question",
    'question: "How should MCP submissions work?"\nasked: "2026-04-01"\nstatus: open\ntags: ["mcp"]\nattempts: []\nrelated_claims: []\nrelated_projects: []\n',
    "Question body.",
  );
  writeMd(
    "projects",
    "agent-workbench",
    'title: "Agent Workbench"\nstatus: "alive"\nstarted: "2026-04-01"\ncurrent_question: "How should agents query memory?"\nlinks: {}\nrelated_thoughts: []\nrelated_claims: []\ntags: ["agents"]\n',
    "Current work.",
  );
  writeMd(
    "projects",
    "old-tool",
    'title: "Old Tool"\nstatus: "dormant"\nstarted: "2025-01-01"\nlinks: {}\nrelated_thoughts: []\nrelated_claims: []\ntags: []\n',
    "Parked.",
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("thinkinglabs-mcp handlers", () => {
  it("queries source-backed public views", () => {
    const result = handleQueryView(
      { repoRoot: root },
      { view: "thoughts", query: "local context", limit: 5 },
    );
    const data = result.structuredContent as {
      source: string;
      count: number;
      items: Array<{ title: string }>;
    };
    expect(data.source).toBe("source");
    expect(data.count).toBe(1);
    expect(data.items[0]?.title).toBe("MCP Notes");
  }, 15_000);

  it("queries sqlite-backed public views when the index exists", () => {
    mkdirSync(join(root, "dist"), { recursive: true });
    writeIndex(collectObjects(join(root, "content"), root), join(root, "dist", "index.sqlite"));
    const result = handleQueryView({ repoRoot: root }, { view: "current_focus", limit: 10 });
    const data = result.structuredContent as {
      source: string;
      count: number;
      items: Array<{ slug: string }>;
    };
    expect(data.source).toBe("sqlite");
    expect(data.items.map((item) => item.slug).sort()).toEqual([
      "agent-workbench",
      "mcp-notes",
      "mcp-question",
    ]);
  }, 15_000);

  it("prechecks contact intent against public policy", () => {
    const result = handleContactPrecheck(
      { repoRoot: root },
      { intent: "Recruitment opportunity", message: "Can we discuss a role?" },
    );
    expect(result.isError).toBeUndefined();
    expect((result.structuredContent as { verdict: string }).verdict).toBe("decline");
  });

  it("marks declined contact send as not accepted", () => {
    const result = handleContactSend(
      { repoRoot: root },
      {
        from: "a@example.com",
        subject: "Podcast",
        intent: "generic pick your brain meeting",
        message: "Can we chat?",
      },
    );
    const data = result.structuredContent as {
      accepted: boolean;
      sent: boolean;
      to: string | null;
    };
    expect(result.isError).toBe(true);
    expect(data.accepted).toBe(false);
    expect(data.sent).toBe(false);
    expect(data.to).toBe("tom@example.com");
  });

  it("returns brain-diff subscription feeds without requiring git history", () => {
    const result = handleSubscribeBrainDiff(
      { repoRoot: root },
      { since: "HEAD~1", include_recent: false, site_url: "https://example.com" },
    );
    const data = result.structuredContent as { subscribed: boolean; feeds: { json: string } };
    expect(data.subscribed).toBe(true);
    expect(data.feeds.json).toBe("https://example.com/feed/brain-diff.json");
  });

  it("writes structured question submissions for triage", () => {
    const result = handleQuestionSubmit(
      { repoRoot: root },
      {
        questionSlug: "mcp-question",
        responder: { name: "Alice", contact: "alice@example.com" },
        body: "Use a structured MCP write tool with triage.",
        pointers: ["https://example.com"],
      },
    );
    const data = result.structuredContent as { accepted: boolean; file: string };
    expect(data.accepted).toBe(true);
    expect(existsSync(data.file)).toBe(true);
  });

  it("rejects path-traversal slugs in question submissions", () => {
    const before = existsSync(join(root, "submissions"));
    for (const slug of [
      "../escaped",
      "../../etc",
      "evil/../../tmp",
      "..",
      "./.",
      "Has Spaces",
      "UPPER",
    ]) {
      const result = handleQuestionSubmit(
        { repoRoot: root },
        {
          questionSlug: slug,
          responder: { name: "Mallory", contact: "m@example.com" },
          body: "attempt",
          pointers: [],
        },
      );
      const data = result.structuredContent as { accepted: boolean; reason: string };
      expect(result.isError).toBe(true);
      expect(data.accepted).toBe(false);
      expect(data.reason).toMatch(/questionSlug|unknown/);
    }
    // No directories were created outside the intended submissions/ tree.
    expect(existsSync(join(root, "submissions", "questions", ".."))).toBe(false);
    if (!before) expect(existsSync(join(root, "submissions"))).toBe(false);
  });

  it("returns a structured error when subscribe_brain_diff fails to walk history", () => {
    // No git history: walkCommits will throw.
    const result = handleSubscribeBrainDiff(
      { repoRoot: root },
      { since: "HEAD~1", include_recent: true, site_url: "https://example.com" },
    );
    const data = result.structuredContent as { subscribed: boolean; reason?: string };
    expect(result.isError).toBe(true);
    expect(data.subscribed).toBe(false);
    expect(typeof data.reason).toBe("string");
  });

  it("reads per-slug objects beyond the paged listing window", () => {
    mkdirSync(join(root, "dist"), { recursive: true });
    const db = new Database(join(root, "dist", "index.sqlite"));
    db.exec(
      "CREATE TABLE objects (id TEXT PRIMARY KEY, kind TEXT NOT NULL, slug TEXT NOT NULL, frontmatter_json TEXT NOT NULL, body_md TEXT NOT NULL, last_touched TEXT NOT NULL)",
    );
    const insert = db.prepare(
      "INSERT INTO objects (id, kind, slug, frontmatter_json, body_md, last_touched) VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (let i = 0; i < 50; i++) {
      const slug = `fresh-${String(i).padStart(2, "0")}`;
      insert.run(
        `claims/${slug}`,
        "claims",
        slug,
        JSON.stringify({ claim: `Fresh claim ${i}.`, tags: ["fresh"] }),
        "Fresh body.",
        "2026-01-01T00:00:00.000Z",
      );
    }
    insert.run(
      "claims/zz-overflow",
      "claims",
      "zz-overflow",
      JSON.stringify({ claim: "Overflow claim is still addressable.", tags: ["overflow"] }),
      "Old body.",
      "2000-01-01T00:00:00.000Z",
    );
    db.close();
    const page = handleQueryView({ repoRoot: root }, { view: "claims", limit: 50 })
      .structuredContent as { items: Array<{ slug: string }> };
    expect(page.items.map((item) => item.slug)).not.toContain("zz-overflow");
    expect(getObject(root, "claims", "zz-overflow")?.title).toBe(
      "Overflow claim is still addressable.",
    );
  });

  it("registers MCP resources and tools through the official SDK", async () => {
    const server = createThinkinglabsMcpServer({ repoRoot: root });
    const client = new Client({ name: "test-client", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const resources = await client.listResources();
      const templates = await client.listResourceTemplates();
      const tools = await client.listTools();
      const thoughts = await client.readResource({ uri: "thinkinglabs://thoughts" });
      const claim = await client.readResource({ uri: "thinkinglabs://claims/mcp-claim" });
      const claimsByTag = await client.readResource({ uri: "thinkinglabs://claims/by-tag/mcp" });
      expect(resources.resources.map((resource) => resource.uri).sort()).toEqual(
        [
          "thinkinglabs://thoughts",
          "thinkinglabs://ai/current-models",
          "thinkinglabs://claims",
          "thinkinglabs://projects",
          "thinkinglabs://decisions",
          "thinkinglabs://predictions",
          "thinkinglabs://inputs",
          "thinkinglabs://inputs/recent",
          "thinkinglabs://questions",
          "thinkinglabs://current_focus",
          "thinkinglabs://claims/recent",
          "thinkinglabs://projects/active",
          "thinkinglabs://decisions/recent",
          "thinkinglabs://predictions/pending",
          "thinkinglabs://predictions/resolved",
          "thinkinglabs://provenance",
          "thinkinglabs://schema/version",
          "thinkinglabs://predictions/calibration",
          "thinkinglabs://thoughts/mcp-notes",
          "thinkinglabs://claims/mcp-claim",
          "thinkinglabs://projects/agent-workbench",
          "thinkinglabs://projects/old-tool",
          "thinkinglabs://predictions/mcp-prediction",
          "thinkinglabs://questions/mcp-question",
        ].sort(),
      );
      expect(templates.resourceTemplates.map((template) => template.uriTemplate).sort()).toEqual(
        [
          "thinkinglabs://claims/by-tag/{tag}",
          "thinkinglabs://claims/{slug}",
          "thinkinglabs://decisions/{slug}",
          "thinkinglabs://inputs/{slug}",
          "thinkinglabs://predictions/{slug}",
          "thinkinglabs://provenance/{slug}",
          "thinkinglabs://projects/{slug}",
          "thinkinglabs://questions/{slug}",
          "thinkinglabs://thoughts/{slug}",
        ].sort(),
      );
      expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
        "contact.precheck",
        "contact.send",
        "query_view",
        "question.submit",
        "subscribe_brain_diff",
      ]);
      const first = thoughts.contents[0];
      expect(first && "text" in first ? first.text : "").toContain("MCP Notes");
      const detail = claim.contents[0];
      expect(detail && "text" in detail ? detail.text : "").toContain(
        "MCP makes personal context reusable",
      );
      const tagged = claimsByTag.contents[0];
      expect(tagged && "text" in tagged ? tagged.text : "").toContain("mcp-claim");
    } finally {
      await client.close();
      await server.close();
    }
  }, 15_000);
});
