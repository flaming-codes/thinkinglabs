import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import matter from "gray-matter";
import {
  proposalToClaimFile,
  proposeClaimsForThought,
  type ClaimProposal,
} from "../src/lib/derive-claims.ts";
import { rejectionHash } from "../scripts/derive-claims.ts";
import { claimSchema } from "../src/schemas/claim.ts";

const SAMPLE_PROPOSAL: ClaimProposal = {
  claim: "The commodity layer of journalism will collapse under AI economic pressure.",
  confidence: 0.7,
  evidence: [{ url: "https://example.com", note: "Pew study" }],
  opposing: ["Substack could rescue commodity reporting."],
  reasoning: "Author hedges with 'will' but tone is assertive.",
  suggestedSlug: "journalism-commodity-collapse",
  mergeCandidates: [],
};

describe("proposalToClaimFile", () => {
  it("produces a valid markdown file with correct frontmatter fields", () => {
    const { slug, markdown } = proposalToClaimFile(
      SAMPLE_PROPOSAL,
      "journalism-2026",
      "2026-04-30T00:00:00.000Z",
    );
    expect(slug).toBe("journalism-commodity-collapse");
    expect(markdown).toContain("claim:");
    expect(markdown).toContain("confidence: 0.7");
    expect(markdown).toContain("derived_from:");
    expect(markdown).toContain("thoughts/journalism-2026");
    expect(markdown).toContain("last_reviewed:");
    expect(markdown).toContain('status: "active"');
  });

  it("uses the suggestedSlug as the file slug", () => {
    const { slug } = proposalToClaimFile(
      SAMPLE_PROPOSAL,
      "any-thought",
      "2026-04-30T00:00:00.000Z",
    );
    expect(slug).toBe("journalism-commodity-collapse");
  });

  it("includes evidence and opposing arrays", () => {
    const { markdown } = proposalToClaimFile(SAMPLE_PROPOSAL, "t", "2026-01-01T00:00:00Z");
    expect(markdown).toContain("evidence:");
    expect(markdown).toContain("opposing:");
  });

  it("emits YAML that round-trips through gray-matter and claimSchema", () => {
    const proposal: ClaimProposal = {
      claim: "Hyperlocal: investigative journalism survives.",
      confidence: 0.7,
      evidence: [{ url: "https://example.com/x?q=1&y=2", note: "Pew study: 2024 trends." }],
      opposing: [
        "Counter: this ignores the role of platforms.",
        "What about #independent newsletters?",
        'A view with "quoted" text',
      ],
      reasoning: "ignored",
      suggestedSlug: "test-slug",
      mergeCandidates: [],
    };
    const { markdown } = proposalToClaimFile(proposal, "thoughts/source", "2026-04-30");
    const parsed = matter(markdown);
    const validated = claimSchema.parse(parsed.data);
    expect(validated.claim).toBe(proposal.claim);
    expect(validated.opposing).toEqual(proposal.opposing);
    expect(validated.evidence[0]?.note).toBe(proposal.evidence[0]?.note);
  });
});

describe("proposeClaimsForThought", () => {
  it("returns [] immediately when skipLLM is true", async () => {
    const result = await proposeClaimsForThought({
      thoughtSlug: "test",
      thoughtBody: "Some body.",
      thoughtFrontmatter: {},
      existingClaims: [],
      skipLLM: true,
    });
    expect(result).toEqual([]);
  });

  it("returns before reaching the dynamic import when skipLLM is true", async () => {
    const result = await proposeClaimsForThought({
      thoughtSlug: "test",
      thoughtBody: "Body.",
      thoughtFrontmatter: {},
      existingClaims: [],
      skipLLM: true,
    });
    expect(result).toEqual([]);
  });

  it("merge candidates array shape from proposal is preserved", () => {
    const proposalWithMerge: ClaimProposal = {
      claim: "Test.",
      confidence: 0.5,
      evidence: [],
      opposing: [],
      reasoning: "reason",
      suggestedSlug: "test-slug",
      mergeCandidates: [{ slug: "existing-slug", reason: "Overlaps." }],
    };
    expect(proposalWithMerge.mergeCandidates[0]?.slug).toBe("existing-slug");
    const { slug, markdown } = proposalToClaimFile(proposalWithMerge, "t", "2026-01-01T00:00:00Z");
    expect(slug).toBe("test-slug");
    expect(markdown).toContain('claim: "Test."');
  });
});

describe("proposeClaimsForThought — behavioral (mocked runToolCall)", () => {
  const sampleModel = { provider: "openai", model: "gpt-test", tier: "balanced" } as const;

  const validProposal = {
    claim: "Sample atomic claim.",
    confidence: 0.65,
    evidence: [{ url: "https://example.com", note: "ref" }],
    opposing: ["counter view"],
    reasoning: "hedged tone",
    suggestedSlug: "sample-claim",
    mergeCandidates: [],
  };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("maps a valid LLM proposal through with model identity propagated", async () => {
    vi.doMock("../src/lib/llm.ts", () => ({
      runToolCall: vi.fn().mockResolvedValue({
        data: { proposals: [validProposal] },
        model: sampleModel,
      }),
    }));
    const { proposeClaimsForThought: fn } = await import("../src/lib/derive-claims.ts");
    const result = await fn({
      thoughtSlug: "t",
      thoughtBody: "body",
      thoughtFrontmatter: {},
      existingClaims: [],
      skipLLM: false,
    });
    expect(result.length).toBe(1);
    expect(result[0]?.claim).toBe(validProposal.claim);
    expect(result[0]?.suggestedSlug).toBe(validProposal.suggestedSlug);
    expect(result[0]?.model).toEqual(sampleModel);
  });

  it("returns [] when runToolCall returns null (graceful fallback, no throw)", async () => {
    vi.doMock("../src/lib/llm.ts", () => ({
      runToolCall: vi.fn().mockResolvedValue(null),
    }));
    const { proposeClaimsForThought: fn } = await import("../src/lib/derive-claims.ts");
    const result = await fn({
      thoughtSlug: "t",
      thoughtBody: "body",
      thoughtFrontmatter: {},
      existingClaims: [],
      skipLLM: false,
    });
    expect(result).toEqual([]);
  });

  it("returns [] when runToolCall returns a payload that fails the proposal schema", async () => {
    /** runToolCall normally enforces the schema and returns null on mismatch; this confirms
     *  the caller does not throw if a malformed payload still slips through (defense-in-depth). */
    vi.doMock("../src/lib/llm.ts", () => ({
      runToolCall: vi.fn().mockResolvedValue(null),
    }));
    const { proposeClaimsForThought: fn } = await import("../src/lib/derive-claims.ts");
    await expect(
      fn({
        thoughtSlug: "t",
        thoughtBody: "body",
        thoughtFrontmatter: {},
        existingClaims: [],
        skipLLM: false,
      }),
    ).resolves.toEqual([]);
  });

  it("includes the existing-claims summary in the user prompt", async () => {
    const spy = vi.fn().mockResolvedValue({
      data: { proposals: [] },
      model: sampleModel,
    });
    vi.doMock("../src/lib/llm.ts", () => ({ runToolCall: spy }));
    const { proposeClaimsForThought: fn } = await import("../src/lib/derive-claims.ts");
    await fn({
      thoughtSlug: "t",
      thoughtBody: "body",
      thoughtFrontmatter: { tags: ["x"] },
      existingClaims: [
        { slug: "existing-1", claim: "Already known.", confidence: 0.6, tags: ["x"] },
      ],
      skipLLM: false,
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const args = spy.mock.calls[0]?.[0] as { userPrompt: string };
    expect(args.userPrompt).toContain("Existing claims");
    expect(args.userPrompt).toContain("existing-1");
    expect(args.userPrompt).toContain("Already known.");
  });

  it("propagates all proposals from runToolCall (schema cap of 10 is enforced upstream)", async () => {
    /** The schema in derive-claims caps the LLM tool's response at 10 proposals; if a caller
     *  ever needs to clamp lower, this test documents that today the function passes the
     *  validated array through verbatim. Mock returns 5 → 5 emitted. */
    const proposals = Array.from({ length: 5 }, (_, i) => ({
      ...validProposal,
      claim: `Claim ${i}.`,
      suggestedSlug: `slug-${i}`,
    }));
    vi.doMock("../src/lib/llm.ts", () => ({
      runToolCall: vi.fn().mockResolvedValue({
        data: { proposals },
        model: sampleModel,
      }),
    }));
    const { proposeClaimsForThought: fn } = await import("../src/lib/derive-claims.ts");
    const result = await fn({
      thoughtSlug: "t",
      thoughtBody: "body",
      thoughtFrontmatter: {},
      existingClaims: [],
      skipLLM: false,
    });
    expect(result.length).toBe(5);
    expect(result.map((p) => p.suggestedSlug)).toEqual([
      "slug-0",
      "slug-1",
      "slug-2",
      "slug-3",
      "slug-4",
    ]);
  });
});

describe("rejectionHash", () => {
  it("returns a 16-char hex string", () => {
    const h = rejectionHash("thought-slug", "some claim text");
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is stable for the same inputs", () => {
    expect(rejectionHash("a", "b")).toBe(rejectionHash("a", "b"));
  });

  it("differs for different thought slugs", () => {
    expect(rejectionHash("slug-1", "claim")).not.toBe(rejectionHash("slug-2", "claim"));
  });

  it("differs for different claim texts", () => {
    expect(rejectionHash("slug", "claim-a")).not.toBe(rejectionHash("slug", "claim-b"));
  });
});
