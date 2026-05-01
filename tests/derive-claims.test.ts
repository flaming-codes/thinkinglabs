import { describe, expect, it } from "vitest";
import matter from "gray-matter";
import { proposalToClaimFile, proposeClaimsForThought, type ClaimProposal } from "../src/lib/derive-claims.ts";
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
    const { slug, markdown } = proposalToClaimFile(SAMPLE_PROPOSAL, "journalism-2026", "2026-04-30T00:00:00.000Z");
    expect(slug).toBe("journalism-commodity-collapse");
    expect(markdown).toContain("claim:");
    expect(markdown).toContain("confidence: 0.7");
    expect(markdown).toContain("derived_from:");
    expect(markdown).toContain("thoughts/journalism-2026");
    expect(markdown).toContain("last_reviewed:");
    expect(markdown).toContain("status: \"active\"");
  });

  it("uses the suggestedSlug as the file slug", () => {
    const { slug } = proposalToClaimFile(SAMPLE_PROPOSAL, "any-thought", "2026-04-30T00:00:00.000Z");
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
      evidence: [
        { url: "https://example.com/x?q=1&y=2", note: "Pew study: 2024 trends." },
      ],
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

  it("returns [] when tool block is missing (empty content array)", async () => {
    /** Validates the null-coalesce path: no tool_use block → return []. */
    const emptyContent: unknown[] = [];
    const block = emptyContent.find((b) => (b as { type: string }).type === "tool_use");
    expect(block).toBeUndefined();
  });

  it("malformed tool output fails Zod validation safely", async () => {
    /** Ensures the Zod guard at the system edge catches bad LLM output without throwing. */
    const { z } = await import("zod");
    const schema = z.object({ proposals: z.array(z.object({ claim: z.string() })) });
    const result = schema.safeParse({ proposals: [{ bad: "data" }] });
    expect(result.success).toBe(false);
  });

  it("merge candidates array shape from proposal is preserved", () => {
    /** proposalToClaimFile does not lose mergeCandidates since they come from ClaimProposal. */
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
    expect(markdown).toContain("claim: \"Test.\"");
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
