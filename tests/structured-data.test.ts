import { describe, expect, it } from "vite-plus/test";
import type { Claim } from "../src/schemas/claim.ts";
import type { Post } from "../src/schemas/post.ts";
import type { Prediction } from "../src/schemas/prediction.ts";
import type { Project } from "../src/schemas/project.ts";
import type { Question } from "../src/schemas/question.ts";
import {
  breadcrumbFor,
  buildPageGraph,
  canonicalUrl,
  claimStructuredData,
  listStructuredData,
  postStructuredData,
  predictionStructuredData,
  projectStructuredData,
  questionStructuredData,
} from "../src/lib/structured-data.ts";

const SITE = "https://example.com";

// schema-dts graph nodes are untyped from the test's perspective, so narrow to a record helper.
type Node = Record<string, unknown>;

function nodes(graph: ReturnType<typeof buildPageGraph>): Node[] {
  return (graph["@graph"] as unknown as Node[]) ?? [];
}

function nodeOfType(graph: ReturnType<typeof buildPageGraph>, type: string): Node | undefined {
  return nodes(graph).find((node) => node["@type"] === type);
}

describe("canonicalUrl", () => {
  it("resolves a relative path against the site origin", () => {
    expect(canonicalUrl("/posts/hello", SITE)).toBe("https://example.com/posts/hello");
  });

  it("strips a trailing slash from non-root paths", () => {
    expect(canonicalUrl("/posts/hello/", SITE)).toBe("https://example.com/posts/hello");
  });

  it("preserves the root path's single slash", () => {
    expect(canonicalUrl("/", SITE)).toBe("https://example.com/");
  });

  it("drops the fragment and query string", () => {
    expect(canonicalUrl("/claims/x?foo=1#section", SITE)).toBe("https://example.com/claims/x");
  });

  it("normalizes an already-absolute URL on the same origin", () => {
    expect(canonicalUrl("https://example.com/inputs/y/#h", SITE)).toBe(
      "https://example.com/inputs/y",
    );
  });

  it("accepts URL instances for both arguments", () => {
    expect(canonicalUrl(new URL("https://example.com/about/"), new URL(SITE))).toBe(
      "https://example.com/about",
    );
  });
});

describe("buildPageGraph", () => {
  it("emits the minimum WebSite, Person, and WebPage nodes with @context", () => {
    const graph = buildPageGraph({
      site: SITE,
      url: "/about",
      title: "About",
      description: "Who I am.",
    });
    expect(graph["@context"]).toBe("https://schema.org");

    const website = nodeOfType(graph, "WebSite");
    const person = nodeOfType(graph, "Person");
    const page = nodeOfType(graph, "WebPage");
    expect(website).toBeDefined();
    expect(person).toBeDefined();
    expect(page).toBeDefined();

    expect(website?.["@id"]).toBe("https://example.com/#website");
    expect(person?.["@id"]).toBe("https://example.com/#person");
    expect(page?.url).toBe("https://example.com/about");
    expect(page?.name).toBe("About");
    expect(page?.description).toBe("Who I am.");
    expect(page?.inLanguage).toBe("en");
    // The page should reference the website and the author by id, not inline them.
    expect(page?.isPartOf).toEqual({ "@id": "https://example.com/#website" });
    expect(page?.author).toEqual({ "@id": "https://example.com/#person" });
  });

  it("omits description when not provided and sets mainEntity from structured data", () => {
    const graph = buildPageGraph({
      site: SITE,
      url: "/posts/hello",
      title: "Hello",
      structuredData: { mainEntityId: "https://example.com/posts/hello#post", nodes: [] },
    });
    const page = nodeOfType(graph, "WebPage");
    expect(page).toBeDefined();
    expect("description" in (page as Node)).toBe(false);
    expect(page?.mainEntity).toEqual({ "@id": "https://example.com/posts/hello#post" });
  });

  it("inlines route-specific nodes into the graph", () => {
    const graph = buildPageGraph({
      site: SITE,
      url: "/claims/x",
      title: "Claim",
      structuredData: {
        mainEntityId: "https://example.com/claims/x#claim",
        nodes: [{ "@type": "Claim", "@id": "https://example.com/claims/x#claim" }],
      },
    });
    expect(nodeOfType(graph, "Claim")).toBeDefined();
  });
});

describe("breadcrumbFor", () => {
  it("builds a positioned ListItem chain with canonicalized item URLs", () => {
    const crumb = breadcrumbFor("/posts/hello", SITE, [
      { name: "Home", url: "/" },
      { name: "Posts", url: "/posts" },
      { name: "Hello", url: "/posts/hello" },
    ]) as unknown as Node;
    expect(crumb["@type"]).toBe("BreadcrumbList");
    expect(crumb["@id"]).toBe("https://example.com/posts/hello#breadcrumb");
    const items = crumb["itemListElement"] as Node[];
    expect(items.map((i) => i["position"])).toEqual([1, 2, 3]);
    expect(items[0]?.["item"]).toBe("https://example.com/");
    expect(items[2]?.["item"]).toBe("https://example.com/posts/hello");
  });
});

describe("listStructuredData", () => {
  it("builds an ItemList with numberOfItems and a stable mainEntityId", () => {
    const result = listStructuredData("/posts", SITE, "Posts", [
      { id: "a", name: "First", url: "/posts/first" },
      { id: "b", name: "Second", url: "/posts/second" },
    ]);
    expect(result.mainEntityId).toBe("https://example.com/posts#items");
    const list = result.nodes[0] as unknown as Node;
    expect(list["@type"]).toBe("ItemList");
    expect(list["numberOfItems"]).toBe(2);
    const items = list["itemListElement"] as Node[];
    expect(items).toHaveLength(2);
    expect(items[1]?.["item"]).toBe("https://example.com/posts/second");
  });
});

describe("postStructuredData", () => {
  const post: Post = {
    title: "On agent harnesses",
    created: "2026-01-10",
    updated: "2026-02-01",
    summary: "Why the harness matters.",
    related_claims: [],
    related_thoughts: [],
    inputs: [],
    tags: ["agents", "mcp"],
  };

  it("emits a BlogPosting with headline, dates, and keywords", () => {
    const result = postStructuredData(
      { id: "posts/on-agent-harnesses", data: post },
      "/posts/on-agent-harnesses",
      SITE,
    );
    expect(result.mainEntityId).toBe("https://example.com/posts/on-agent-harnesses#post");
    const blog = result.nodes.find((n) => (n as Node)["@type"] === "BlogPosting") as Node;
    expect(blog).toBeDefined();
    expect(blog["@id"]).toBe("https://example.com/posts/on-agent-harnesses#post");
    expect(blog["headline"]).toBe("On agent harnesses");
    expect(blog["datePublished"]).toBe("2026-01-10");
    expect(blog["dateModified"]).toBe("2026-02-01");
    expect(blog["description"]).toBe("Why the harness matters.");
    expect(blog["keywords"]).toEqual(["agents", "mcp"]);
    expect(blog["inLanguage"]).toBe("en");
    expect(blog["author"]).toEqual({ "@id": "https://example.com/#person" });
  });

  it("includes a breadcrumb that ends at the current post", () => {
    const result = postStructuredData(
      { id: "posts/on-agent-harnesses", data: post },
      "/posts/on-agent-harnesses",
      SITE,
    );
    const crumb = result.nodes.find((n) => (n as Node)["@type"] === "BreadcrumbList") as Node;
    const items = crumb["itemListElement"] as Node[];
    expect(items.map((i) => i["name"])).toEqual(["Home", "Posts", "On agent harnesses"]);
  });

  it("omits description when the post has no summary", () => {
    const noSummary: Post = { ...post };
    delete (noSummary as { summary?: string }).summary;
    const result = postStructuredData({ id: "posts/x", data: noSummary }, "/posts/x", SITE);
    const blog = result.nodes.find((n) => (n as Node)["@type"] === "BlogPosting") as Node;
    expect("description" in blog).toBe(false);
  });
});

describe("claimStructuredData", () => {
  const claim: Claim = {
    claim: "MCP makes personal context reusable.",
    confidence: 0.7,
    evidence: [{ url: "https://example.org/source" }, { note: "Field note only." }, {}],
    opposing: [],
    derived_from: ["thoughts/mcp-notes"],
    last_reviewed: "2026-03-01",
    status: "active",
    supersedes: [],
    superseded_by: [],
    tags: ["mcp"],
  };

  it("emits a Claim node with text, status, and citation pulled from evidence", () => {
    const result = claimStructuredData({ id: "claims/mcp", data: claim }, "/claims/mcp", SITE);
    const node = result.nodes.find((n) => (n as Node)["@type"] === "Claim") as Node;
    expect(node["@id"]).toBe("https://example.com/claims/mcp#claim");
    expect(node["name"]).toBe("MCP makes personal context reusable.");
    expect(node["text"]).toBe("MCP makes personal context reusable.");
    expect(node["dateModified"]).toBe("2026-03-01");
    expect(node["creativeWorkStatus"]).toBe("active");
    // Evidence with a url uses the url; note-only uses the note; empty entries are dropped.
    expect(node["citation"]).toEqual(["https://example.org/source", "Field note only."]);
    expect(node["keywords"]).toEqual(["mcp"]);
  });
});

describe("predictionStructuredData", () => {
  const prediction: Prediction = {
    prediction: "MCP support grows.",
    made: "2026-01-01",
    resolves: "2026-12-01",
    confidence: 0.8,
    resolution: "pending",
    resolved_on: null,
    resolution_note: null,
    evidence_at_time: [],
    tags: ["mcp"],
  };

  it("emits a Statement with dateCreated and expires mapped from made/resolves", () => {
    const result = predictionStructuredData(
      { id: "predictions/p", data: prediction },
      "/predictions/p",
      SITE,
    );
    const node = result.nodes.find((n) => (n as Node)["@type"] === "Statement") as Node;
    expect(node["@id"]).toBe("https://example.com/predictions/p#prediction");
    expect(node["dateCreated"]).toBe("2026-01-01");
    expect(node["expires"]).toBe("2026-12-01");
    expect(node["creativeWorkStatus"]).toBe("pending");
    expect(node["text"]).toBe("MCP support grows.");
  });
});

describe("projectStructuredData", () => {
  const project: Project = {
    title: "Agent Workbench",
    status: "alive",
    started: "2026-04-01",
    current_question: "How should agents query memory?",
    links: { repo: "https://github.com/example/agent-workbench" },
    related_thoughts: [],
    related_claims: [],
    tags: ["agents"],
  };

  it("emits a Project with foundingDate, sameAs repo, and description from current_question", () => {
    const result = projectStructuredData(
      { id: "projects/aw", data: project },
      "/projects/aw",
      SITE,
    );
    const node = result.nodes.find((n) => (n as Node)["@type"] === "Project") as Node;
    expect(node["foundingDate"]).toBe("2026-04-01");
    expect(node["sameAs"]).toBe("https://github.com/example/agent-workbench");
    expect(node["description"]).toBe("How should agents query memory?");
  });
});

describe("questionStructuredData", () => {
  it("escapes-safe: keeps angle brackets and ampersands verbatim in name/text", () => {
    const question: Question = {
      question: "Is <script>alert(1)</script> & raw HTML safe to embed?",
      asked: "2026-05-01",
      status: "open",
      tags: ["security"],
      attempts: [],
      related_claims: [],
      related_projects: [],
    };
    const result = questionStructuredData(
      { id: "questions/q", data: question },
      "/questions/q",
      SITE,
    );
    const node = result.nodes.find((n) => (n as Node)["@type"] === "Question") as Node;
    // The builder stores the raw string; HTML-escaping is the renderer's responsibility, so the
    // JSON-LD value must round-trip byte-for-byte and never be pre-escaped or truncated here.
    expect(node["name"]).toBe("Is <script>alert(1)</script> & raw HTML safe to embed?");
    expect(node["text"]).toBe("Is <script>alert(1)</script> & raw HTML safe to embed?");
    // The serialized JSON must remain valid and reversible.
    const round = JSON.parse(JSON.stringify(node)) as Node;
    expect(round["name"]).toBe(node["name"]);
  });
});
