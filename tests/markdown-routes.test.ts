import { readFileSync } from "node:fs";
import matter from "gray-matter";
import { describe, expect, it, vi, beforeEach, afterEach } from "vite-plus/test";
import { KIND_REGISTRY, LISTING_KINDS } from "../src/lib/registry.ts";

const postEntry = {
  id: "the-site-is-the-instrument",
  data: {
    title: "The site is the instrument",
    created: "2026-05-09",
    updated: "2026-05-10",
    summary: "How thinkinglabs became a markdown-canonical public working surface.",
    related_claims: ["prompt-is-spec-is-implementation", "missing-claim"],
    related_thoughts: [],
    tags: ["systems", "agents"],
  },
  body: "First paragraph.\n\n```ts\nconst exact = true;\n```\n",
};

const claimEntry = {
  id: "prompt-is-spec-is-implementation",
  data: {
    claim: "The prompt is the spec is the implementation.",
    confidence: 0.75,
    evidence: [],
    opposing: [],
    derived_from: ["thoughts/agents-enable-radical-simplicity"],
    last_reviewed: "2026-05-10",
    status: "active",
    supersedes: [],
    superseded_by: [],
    tags: [],
  },
  body: "",
};

const thoughtEntry = {
  id: "agents-enable-radical-simplicity",
  data: {
    title: "Agents enable radical simplicity",
    created: "2026-05-10",
    updated: "2026-05-10",
    tags: [],
    claims: [],
    inputs: [],
  },
  body: "Agents enable radical simplicity.",
};

const inputEntry = {
  id: "openai-workspace-agents-chatgpt",
  data: {
    title: "Introducing workspace agents in ChatGPT",
    url: "https://openai.com/index/introducing-workspace-agents-in-chatgpt/",
    source: "OpenAI",
    consumed: "2026-05-14",
    note: "Workspace agents signal agent directories.",
    tags: ["agents"],
  },
  body: "OpenAI introduces shared workspace agents.",
};

const predictionEntry = {
  id: "agent-marketplaces-succeed-app-stores",
  data: {
    prediction: "Agent marketplaces will succeed app stores.",
    made: "2026-05-14",
    resolves: "2027-05-14",
    confidence: 0.57,
    resolution: "pending",
    resolved_on: null,
    resolution_note: null,
    evidence_at_time: [
      "thoughts/agents-enable-radical-simplicity",
      "inputs/openai-workspace-agents-chatgpt",
    ],
    tags: ["agents"],
  },
  body: "Prediction body.",
};

function installContentMock(): void {
  vi.doMock("astro:content", () => ({
    getCollection: vi.fn(async (kind: string) => {
      if (kind === "posts") return [postEntry];
      if (kind === "claims") return [claimEntry];
      if (kind === "thoughts") return [thoughtEntry];
      if (kind === "inputs") return [inputEntry];
      if (kind === "predictions") return [predictionEntry];
      return [];
    }),
  }));
}

describe("Markdown route contracts and serializers", () => {
  beforeEach(() => {
    vi.resetModules();
    installContentMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("validates detail, listing, and static envelopes", async () => {
    const {
      markdownDetailEnvelopeSchema,
      markdownListingEnvelopeSchema,
      markdownStaticEnvelopeSchema,
    } = await import("../src/lib/markdown-routes.ts");

    expect(() =>
      markdownDetailEnvelopeSchema.parse({
        variant: "detail",
        kind: "posts",
        slug: "x",
        url: "/posts/x",
        title: "X",
        source_path: "content/posts/x.md",
        frontmatter: { title: "X" },
        agent_metadata: {
          source_path: "content/posts/x.md",
          html_url: "/posts/x",
          markdown_url: "/posts/x.md",
          source_url: "https://github.com/flaming-codes/thinkinglabs/blob/main/content/posts/x.md",
          summary: "X",
          word_count: 1,
          approx_token_count: 1,
          token_estimate: "chars/4",
        },
      }),
    ).not.toThrow();
    expect(() =>
      markdownListingEnvelopeSchema.parse({
        variant: "listing",
        kind: "posts",
        url: "/posts",
        title: "Posts",
        description: "Posts",
        count: 1,
      }),
    ).not.toThrow();
    expect(() =>
      markdownStaticEnvelopeSchema.parse({
        variant: "static",
        url: "/about",
        title: "About",
        description: "About this site.",
      }),
    ).not.toThrow();
  });

  it("rejects malformed, non-public, and unknown-link envelopes before response generation", async () => {
    const { markdownDetailEnvelopeSchema } = await import("../src/lib/markdown-routes.ts");
    expect(() =>
      markdownDetailEnvelopeSchema.parse({
        variant: "detail",
        kind: "provenance",
        slug: "x",
        url: "/provenance/x",
        title: "Provenance should not be public",
        source_path: "content/provenance/x.md",
        frontmatter: {},
      }),
    ).toThrow();
    expect(() =>
      markdownDetailEnvelopeSchema.parse({
        variant: "detail",
        kind: "posts",
        slug: "x",
        url: "/posts/x",
        title: "Unknown link field",
        source_path: "content/posts/x.md",
        frontmatter: {},
        links: { not_a_link_field: [] },
      }),
    ).toThrow();
    expect(() =>
      markdownDetailEnvelopeSchema.parse({
        variant: "detail",
        kind: "posts",
        slug: "x",
        url: "/posts/x",
        title: "Missing agent metadata",
        source_path: "content/posts/x.md",
        frontmatter: {},
      }),
    ).toThrow();
  });

  it("preserves detail body bytes after the YAML envelope", async () => {
    const { renderDetailMarkdown } = await import("../src/lib/markdown-routes.ts");
    const markdown = renderDetailMarkdown({ kind: "posts", entry: postEntry });
    const parsed = matter(markdown);

    expect(parsed.data["variant"]).toBe("detail");
    expect(parsed.data["kind"]).toBe("posts");
    expect(parsed.data["frontmatter"]).toMatchObject({
      title: postEntry.data.title,
    });
    expect(parsed.data["agent_metadata"]).toMatchObject({
      source_path: "content/posts/the-site-is-the-instrument.md",
      html_url: "/posts/the-site-is-the-instrument",
      markdown_url: "/posts/the-site-is-the-instrument.md",
      token_estimate: "chars/4",
    });
    expect(parsed.data["agent_metadata"]["approx_token_count"]).toBeGreaterThan(0);
    expect(parsed.content).toBe(postEntry.body);
  });

  it("emits resolved and unresolved internal detail links without adding UI-derived fields", async () => {
    const { buildMarkdownRouteRecords } = await import("../src/lib/markdown-routes.ts");
    const records = await buildMarkdownRouteRecords();
    const postRecord = records.find(
      (record) => record.route === "/posts/the-site-is-the-instrument",
    );
    expect(postRecord).toBeDefined();

    const parsed = matter(postRecord?.markdown ?? "");
    expect(parsed.data["links"]).toMatchObject({
      related_claims: [
        {
          status: "resolved",
          ref: "prompt-is-spec-is-implementation",
          kind: "claims",
          slug: "prompt-is-spec-is-implementation",
          url: "/claims/prompt-is-spec-is-implementation",
        },
        {
          status: "unresolved",
          ref: "missing-claim",
          slug: "missing-claim",
          expected_kinds: ["claims"],
        },
      ],
    });
    expect(parsed.data["readingTime"]).toBeUndefined();
    expect(parsed.data["history"]).toBeUndefined();
  });

  it("emits prediction evidence links to thoughts and inputs", async () => {
    const { buildMarkdownRouteRecords } = await import("../src/lib/markdown-routes.ts");
    const records = await buildMarkdownRouteRecords();
    const predictionRecord = records.find(
      (record) => record.route === "/predictions/agent-marketplaces-succeed-app-stores",
    );
    expect(predictionRecord).toBeDefined();

    const parsed = matter(predictionRecord?.markdown ?? "");
    expect(parsed.data["links"]).toMatchObject({
      evidence_at_time: [
        {
          status: "resolved",
          ref: "thoughts/agents-enable-radical-simplicity",
          kind: "thoughts",
          slug: "agents-enable-radical-simplicity",
          title: "Agents enable radical simplicity",
          url: "/thoughts/agents-enable-radical-simplicity",
        },
        {
          status: "resolved",
          ref: "inputs/openai-workspace-agents-chatgpt",
          kind: "inputs",
          slug: "openai-workspace-agents-chatgpt",
          title: "Introducing workspace agents in ChatGPT",
          url: "/inputs/openai-workspace-agents-chatgpt",
        },
      ],
    });
  });

  it("does not generate provenance or other non-public Markdown records", async () => {
    const { buildMarkdownRouteRecords } = await import("../src/lib/markdown-routes.ts");
    const routes = (await buildMarkdownRouteRecords()).map((record) => record.route);

    expect(routes).toContain("/posts");
    expect(routes).toContain("/posts/the-site-is-the-instrument");
    expect(routes).not.toContain("/provenance");
    expect(routes.some((route) => route.startsWith("/provenance/"))).toBe(false);
  });

  it("generates listing Markdown routes for every public listing kind", async () => {
    const { buildMarkdownRouteRecords } = await import("../src/lib/markdown-routes.ts");
    const routes = (await buildMarkdownRouteRecords()).map((record) => record.route);

    for (const kind of LISTING_KINDS) {
      const route = KIND_REGISTRY[kind].route;
      if (route) expect(routes).toContain(route);
    }
  });

  it("rejects duplicate Markdown route slugs", async () => {
    vi.resetModules();
    vi.doUnmock("astro:content");
    vi.doMock("astro:content", () => ({
      getCollection: vi.fn(async (kind: string) => {
        if (kind === "predictions") {
          return [
            {
              id: "calibration",
              data: {
                prediction: "This collides with the static calibration page.",
                made: "2026-01-01",
                resolves: "2026-12-31",
                confidence: 0.5,
                resolution: "pending",
                resolved_on: null,
                resolution_note: null,
                evidence_at_time: [],
                tags: [],
              },
              body: "",
            },
          ];
        }
        return [];
      }),
    }));

    const { buildMarkdownRouteRecords } = await import("../src/lib/markdown-routes.ts");
    await expect(buildMarkdownRouteRecords()).rejects.toThrow("Duplicate Markdown route slug");
  });
});

describe("Markdown route endpoint", () => {
  beforeEach(() => {
    vi.resetModules();
    installContentMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns a Markdown detail response", async () => {
    const route = await import("../src/pages/[...slug].md.ts");
    const response = await route.GET({
      params: { slug: "posts/the-site-is-the-instrument" },
    } as never);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")?.toLowerCase()).toContain("text/markdown");
    const parsed = matter(await response.text());
    expect(response.headers.get("x-agent-token-estimate")).toMatch(/^\d+$/);
    expect(parsed.data["variant"]).toBe("detail");
    expect(parsed.content).toBe(postEntry.body);
  });

  it("returns a Markdown listing response", async () => {
    const route = await import("../src/pages/[...slug].md.ts");
    const response = await route.GET({ params: { slug: "posts" } } as never);

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("# Posts");
    expect(text).toContain("/posts/the-site-is-the-instrument.md");
  });

  it("returns a Markdown about response that documents the convention", async () => {
    const route = await import("../src/pages/[...slug].md.ts");
    const response = await route.GET({ params: { slug: "about" } } as never);

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("Canonical public content pages, listings, and selected static pages");
    expect(text).toContain("contract-validated envelopes");
  });

  it("returns /index.md as the Markdown equivalent of /", async () => {
    const route = await import("../src/pages/[...slug].md.ts");
    const response = await route.GET({ params: { slug: "index" } } as never);

    expect(response.status).toBe(200);
    const parsed = matter(await response.text());
    expect(parsed.data["variant"]).toBe("static");
    expect(parsed.data["url"]).toBe("/");
  });

  it("returns 404 for invalid and non-public Markdown routes", async () => {
    const route = await import("../src/pages/[...slug].md.ts");
    const missing = await route.GET({
      params: { slug: "does-not-exist" },
    } as never);
    const provenance = await route.GET({
      params: { slug: "provenance/secret" },
    } as never);

    expect(missing.status).toBe(404);
    expect(provenance.status).toBe(404);
  });
});

describe("Markdown surface documentation", () => {
  it("documents Markdown URL variants in README, rendering docs, ADR, and About source", () => {
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    const rendering = readFileSync(
      new URL("../docs/agents/rendering-pipeline.md", import.meta.url),
      "utf8",
    );
    const adr = readFileSync(
      new URL("../docs/architecture/ADR-004-renderer-pipeline.md", import.meta.url),
      "utf8",
    );
    const about = readFileSync(
      new URL("../src/frontend/thinkinglabs-ui/pages/AboutPageComposition.astro", import.meta.url),
      "utf8",
    );

    expect(readme).toContain("contract-validated Markdown variants");
    expect(rendering).toContain("Markdown URL variants");
    expect(adr).toContain("appending `.md` to a canonical public page or content URL");
    expect(about).toContain("Canonical public content pages, listings, and selected static pages");
    expect(about).not.toContain("Every public page has an agent-readable Markdown sibling");
  });
});
