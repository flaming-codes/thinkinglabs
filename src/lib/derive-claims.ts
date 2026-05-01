import { z } from "zod";
import { runToolCall } from "./llm.ts";

/** Rough proposal an LLM emits before reviewer judgment; payload of a ReviewProposal. */
export interface ClaimProposal {
  readonly claim: string;
  readonly confidence: number;
  readonly evidence: ReadonlyArray<{ url?: string; note?: string }>;
  readonly opposing: ReadonlyArray<string>;
  readonly reasoning: string;
  readonly suggestedSlug: string;
  readonly mergeCandidates: ReadonlyArray<{ slug: string; reason: string }>;
}

/** Existing claim summary fed to the LLM for merge detection. */
export interface ExistingClaimSummary {
  readonly slug: string;
  readonly claim: string;
  readonly confidence: number;
  readonly tags: ReadonlyArray<string>;
}

/** Input bundle for proposal generation. */
export interface ProposeClaimsArgs {
  readonly thoughtSlug: string;
  readonly thoughtBody: string;
  readonly thoughtFrontmatter: Record<string, unknown>;
  readonly existingClaims: ReadonlyArray<ExistingClaimSummary>;
  readonly skipLLM: boolean;
}

/** Zod schema for one proposal as returned by the LLM tool. */
const proposalItemSchema = z.object({
  claim: z.string().min(1),
  confidence: z.number().min(0).max(1),
  evidence: z
    .array(z.object({ url: z.string().optional(), note: z.string().optional() }))
    .default([]),
  opposing: z.array(z.string()).default([]),
  reasoning: z.string().default(""),
  suggestedSlug: z.string().min(1),
  mergeCandidates: z.array(z.object({ slug: z.string(), reason: z.string() })).default([]),
});

/** Zod schema for the full tool response array. */
const toolResponseSchema = z.object({
  proposals: z.array(proposalItemSchema).min(0).max(10),
});

/** System prompt is reused across thoughts; prompt-cached so repeated calls within a session are cheap. */
const SYSTEM_PROMPT = `You are a claim-extraction assistant for a personal knowledge system.

Given a thought (long-form prose), extract 3–10 atomic claim proposals. Each claim must be:
- A single, self-contained assertion (one sentence).
- Atomic: not a conjunction of two claims.
- Citable: someone could evaluate it as true, false, or uncertain.
- Faithful to the author's stated or implied view; do not invent positions.

For each proposal provide:
- claim: the atomic claim sentence, rewritten for clarity if needed.
- confidence: a float [0,1] reflecting the author's own hedging language (strong assertions → 0.8+, heavily hedged → 0.4–0.6).
- evidence: URLs and notes the thought references inline (only what is in the text).
- opposing: views the author already acknowledges as counterarguments.
- reasoning: one sentence explaining why you chose this confidence level.
- suggestedSlug: a kebab-case slug under 60 chars (e.g. "journalism-commodity-collapse").
- mergeCandidates: from the provided existing-claims list, any whose meaning substantially overlaps this proposal. Include slug and a one-sentence reason.

Skip rhetorical flourishes, metaphors, and statements too compressed to stand alone. Aim for 3–10 proposals; fewer is better if the text is sparse.

Call extract_claim_proposals exactly once.`;

/** Tool definition; forced tool-use guarantees the response shape so we don't parse free-text. */
const TOOL = {
  name: "extract_claim_proposals",
  description: "Return an array of atomic claim proposals extracted from the thought.",
  schema: toolResponseSchema,
};

/** Builds the user-turn prompt including existing claims for merge detection. */
function buildUserPrompt(args: ProposeClaimsArgs): string {
  const fm = JSON.stringify(args.thoughtFrontmatter, null, 2);
  const existing =
    args.existingClaims.length > 0
      ? `\n\nExisting claims (for merge detection):\n${args.existingClaims.map((c) => `- slug: ${c.slug}\n  claim: ${c.claim}\n  confidence: ${c.confidence}\n  tags: ${c.tags.join(", ")}`).join("\n")}`
      : "";
  return `Thought slug: ${args.thoughtSlug}\nFrontmatter:\n${fm}\n\nBody:\n${args.thoughtBody}${existing}`;
}

/** Generates 3–10 proposals for one thought; returns [] when LLM is skipped. */
export async function proposeClaimsForThought(
  args: ProposeClaimsArgs,
): Promise<ReadonlyArray<ClaimProposal>> {
  if (args.skipLLM) return [];
  const result = await runToolCall({
    tier: "balanced",
    maxTokens: 4096,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(args),
    tool: TOOL,
  });
  if (!result) return [];
  return result.proposals as ReadonlyArray<ClaimProposal>;
}

/** Serializes a proposal into a `content/claims/<slug>.md` markdown+frontmatter string ready to write. */
export function proposalToClaimFile(
  proposal: ClaimProposal,
  thoughtSlug: string,
  nowISO: string,
): { slug: string; markdown: string } {
  const slug = proposal.suggestedSlug;
  const fm: Record<string, unknown> = {
    claim: proposal.claim,
    confidence: proposal.confidence,
    evidence: proposal.evidence.length > 0 ? proposal.evidence : [],
    opposing: proposal.opposing.length > 0 ? proposal.opposing : [],
    derived_from: [`thoughts/${thoughtSlug}`],
    last_reviewed: nowISO.slice(0, 10),
    status: "active",
    supersedes: [],
    superseded_by: [],
    tags: [],
  };
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${k}: []`);
      } else if (typeof v[0] === "object") {
        lines.push(`${k}:`);
        for (const item of v as Record<string, string>[]) {
          const entries = Object.entries(item).filter(([, val]) => val !== undefined);
          if (entries.length > 0) {
            lines.push(
              `  - ` + entries.map(([ik, iv]) => `${ik}: ${JSON.stringify(iv)}`).join("\n    "),
            );
          }
        }
      } else {
        lines.push(`${k}:`);
        for (const item of v as string[]) lines.push(`  - ${JSON.stringify(item)}`);
      }
    } else {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    }
  }
  lines.push("---", "");
  return { slug, markdown: lines.join("\n") };
}
