import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { daysBetween } from "./clock.ts";
import { lastTouched } from "./git.ts";
import { runToolCall } from "./llm.ts";
import { walkMarkdown } from "./walk-content.ts";

/** Reasons a claim might be flagged for review; the union is closed so consumers can switch exhaustively. */
export type StaleReason =
  | "past-threshold"
  | "evidence-shift"
  | "contradicting-thought"
  | "deprecation-candidate";

/** A flagged claim plus its diagnostic context; payload of a ReviewProposal in the CLI. */
export interface StaleFlag {
  readonly slug: string;
  readonly path: string;
  readonly lastReviewedISO: string;
  readonly daysSinceReview: number;
  readonly reasons: ReadonlyArray<StaleReason>;
  readonly notes: ReadonlyArray<string>;
  readonly relatedNewerObjects: ReadonlyArray<{
    kind: "thought" | "post" | "input";
    slug: string;
    touchedISO: string;
  }>;
}

/** Args accepted by detectStaleClaims. */
export interface DetectStaleClaimsArgs {
  readonly cwd: string;
  readonly contentRoot: string;
  readonly nowISO: string;
  readonly thresholdDays: number;
  readonly skipLLM: boolean;
}

/** Zod schema for the LLM shift-detection tool output. */
const shiftSchema = z.object({
  shifted: z.boolean(),
  reasoning: z.string(),
  contradicts: z.boolean().default(false),
});

/** System prompt for shift detection; prompt-cached so repeated calls within one session are cheap. */
const SHIFT_SYSTEM_PROMPT = `You are a claim-staleness evaluator for a personal knowledge system.

Given an existing claim (with its confidence, evidence, and opposing views) and a list of newer related objects
(thoughts, posts, or inputs written after the claim was last reviewed), decide whether the evidence for the
claim has likely shifted.

Return your answer via the detect_claim_shift tool exactly once:
- shifted: true if any newer object contains information that materially changes the evidential picture.
- contradicts: true only when a newer object directly contradicts the claim (not merely adds nuance).
- reasoning: a single sentence explaining the decision.`;

/** Tool definition for LLM shift detection. */
const SHIFT_TOOL = {
  name: "detect_claim_shift",
  description: "Decide whether newer related objects shift the evidential picture for the claim.",
  schema: shiftSchema,
};

/** Extract string tags from a frontmatter data object. */
function tagsOf(data: Record<string, unknown>): ReadonlyArray<string> {
  return Array.isArray(data["tags"]) ? (data["tags"] as string[]) : [];
}

/** Extract string links from a frontmatter array field. */
function linksOf(data: Record<string, unknown>, field: string): ReadonlyArray<string> {
  return Array.isArray(data[field]) ? (data[field] as string[]) : [];
}

/** Returns true if two tag sets share at least one tag. */
function sharesTag(a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean {
  const setB = new Set(b);
  return a.some((t) => setB.has(t));
}

/** Calls the LLM to detect whether newer objects shifted the evidential picture for the claim. */
async function callShiftDetection(
  claimData: Record<string, unknown>,
  newerObjects: ReadonlyArray<{
    kind: "thought" | "post" | "input";
    slug: string;
    touchedISO: string;
    content: string;
  }>,
): Promise<{ shifted: boolean; reasoning: string; contradicts: boolean }> {
  const claimContext = [
    `claim: ${String(claimData["claim"] ?? "")}`,
    `confidence: ${String(claimData["confidence"] ?? "")}`,
    `evidence: ${JSON.stringify(claimData["evidence"] ?? [])}`,
    `opposing: ${JSON.stringify(claimData["opposing"] ?? [])}`,
  ].join("\n");
  const newerContext = newerObjects
    .map((o) => `[${o.kind}/${o.slug} — last touched ${o.touchedISO}]\n${o.content.slice(0, 800)}`)
    .join("\n\n---\n\n");
  const userMessage = `Claim:\n${claimContext}\n\nNewer related objects:\n${newerContext}`;
  const result = await runToolCall({
    tier: "balanced",
    maxTokens: 256,
    systemPrompt: SHIFT_SYSTEM_PROMPT,
    userPrompt: userMessage,
    tool: SHIFT_TOOL,
  });
  if (!result)
    return { shifted: false, reasoning: "LLM returned no tool call", contradicts: false };
  return result;
}

/** Scans the claims directory and returns flags; LLM is consulted only when shiftDetection is on. */
export async function detectStaleClaims(
  args: DetectStaleClaimsArgs,
): Promise<ReadonlyArray<StaleFlag>> {
  const { cwd, nowISO, thresholdDays, skipLLM } = args;

  const claims = walkMarkdown({ cwd, kind: "claims" });
  const thoughts = walkMarkdown({ cwd, kind: "thoughts" });
  const posts = walkMarkdown({ cwd, kind: "posts" });
  const inputs = walkMarkdown({ cwd, kind: "inputs" });

  /** Resolve last-touched ISO for a content object, falling back to git. */
  async function touchedISO(obj: {
    path: string;
    data: Record<string, unknown>;
  }): Promise<string | null> {
    const fm = obj.data["last_touched"] ?? obj.data["updated"] ?? obj.data["consumed"];
    if (typeof fm === "string") return fm;
    if (fm instanceof Date) return fm.toISOString();
    return lastTouched(obj.path);
  }

  const flags: StaleFlag[] = [];

  for (const claim of claims) {
    const lastReviewedRaw = claim.data["last_reviewed"];
    if (!lastReviewedRaw) continue;
    const lastReviewedISO =
      lastReviewedRaw instanceof Date ? lastReviewedRaw.toISOString() : String(lastReviewedRaw);
    const daysSinceReview = daysBetween(lastReviewedISO, nowISO);

    const claimTags = tagsOf(claim.data);
    const derivedFrom = linksOf(claim.data, "derived_from");
    const status = typeof claim.data["status"] === "string" ? claim.data["status"] : "active";

    /** Collect related newer objects: share a tag OR appear in derived_from. */
    const candidates: Array<{
      kind: "thought" | "post" | "input";
      slug: string;
      touchedISO: string;
      content: string;
    }> = [];

    const kindDirs: Array<{ kind: "thought" | "post" | "input"; entries: typeof thoughts }> = [
      { kind: "thought", entries: thoughts },
      { kind: "post", entries: posts },
      { kind: "input", entries: inputs },
    ];

    for (const { kind, entries } of kindDirs) {
      for (const obj of entries) {
        const touched = await touchedISO(obj);
        if (!touched) continue;
        if (new Date(touched).getTime() <= new Date(lastReviewedISO).getTime()) continue;
        const objTags = tagsOf(obj.data);
        const isLinked = derivedFrom.some((ref) => ref.includes(obj.slug));
        if (!sharesTag(claimTags, objTags) && !isLinked) continue;
        candidates.push({
          kind,
          slug: obj.slug,
          touchedISO: touched,
          content: readFileSync(obj.path, "utf8"),
        });
      }
    }

    /** Sort by most-recent first and cap at 10. */
    candidates.sort((a, b) => new Date(b.touchedISO).getTime() - new Date(a.touchedISO).getTime());
    const relatedNewer = candidates.slice(0, 10);

    const reasons: StaleReason[] = [];
    const notes: string[] = [];

    if (daysSinceReview >= thresholdDays) {
      reasons.push("past-threshold");
      notes.push(`Not reviewed for ${daysSinceReview} days (threshold: ${thresholdDays}).`);
    }

    if (!skipLLM && relatedNewer.length > 0) {
      const result = await callShiftDetection(claim.data, relatedNewer);
      if (result.shifted) {
        if (result.contradicts) {
          reasons.push("contradicting-thought");
          notes.push(`Contradiction detected: ${result.reasoning}`);
        } else {
          reasons.push("evidence-shift");
          notes.push(`Evidence may have shifted: ${result.reasoning}`);
        }
      }
    }

    if (
      daysSinceReview > 180 &&
      relatedNewer.length === 0 &&
      status === "active" &&
      !reasons.includes("past-threshold")
    ) {
      reasons.push("deprecation-candidate");
      notes.push(
        "Claim has not been reviewed in over 180 days with no related newer content — may be forgotten.",
      );
    } else if (
      daysSinceReview > 180 &&
      relatedNewer.length === 0 &&
      status === "active" &&
      reasons.length > 0
    ) {
      reasons.push("deprecation-candidate");
      notes.push("No related newer objects; may be forgotten.");
    }

    if (reasons.length > 0) {
      flags.push({
        slug: claim.slug,
        path: join(cwd, "content", "claims", `${claim.slug}.md`),
        lastReviewedISO,
        daysSinceReview,
        reasons,
        notes,
        relatedNewerObjects: relatedNewer.map(({ kind, slug, touchedISO }) => ({
          kind,
          slug,
          touchedISO,
        })),
      });
    }
  }

  flags.sort((a, b) => b.daysSinceReview - a.daysSinceReview);
  return flags;
}
