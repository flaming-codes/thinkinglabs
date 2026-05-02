import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { runToolCall } from "../llm.ts";
import { nowISO } from "../clock.ts";
import { loadContent } from "../content-repo.ts";
import { deprecateSectionCallout, restampSectionVerified } from "../body-append.ts";
import { editMarkdownWithSchema } from "../edit-markdown.ts";
import { freshnessState } from "../freshness.ts";
import { enqueue, proposalId, readQueue } from "../proposal-queue.ts";
import type { QueuedProposal } from "../proposal-queue.ts";
import { registerHandler, type HandlerContext } from "../proposal-dispatch.ts";
import { parseSectionStamps } from "../section-stamps.ts";
import { walkFileHistory } from "../git.ts";
import { objectRef } from "../provenance.ts";

/** Zod schema for the LLM freshness-review tool output. */
export const FreshnessReviewDraft = z.object({
  whatMayHaveChanged: z.string().min(1),
  recommend: z.enum(["confirm-still-true", "revise", "deprecate"]),
  reasoning: z.string().min(1),
});

/** Inferred type for FreshnessReviewDraft. */
export type FreshnessReviewDraft = z.infer<typeof FreshnessReviewDraft>;

/** Payload carried by a post-section-restamp proposal. */
export const PostSectionRestampPayload = z.object({
  postSlug: z.string(),
  sectionAnchor: z.string(),
  sectionHeading: z.string(),
  lastVerifiedISO: z.string(),
  daysSinceVerified: z.number(),
  whatMayHaveChanged: z.string(),
  recommendation: z.enum(["confirm-still-true", "revise", "deprecate"]),
  reasoning: z.string(),
});

/** Inferred type for PostSectionRestampPayload. */
export type PostSectionRestampPayload = z.infer<typeof PostSectionRestampPayload>;

/** Summary returned by runFreshnessReview. */
export interface FreshnessReviewSummary {
  readonly scanned: number;
  readonly flagged: number;
  readonly proposed: number;
  readonly deduped: number;
  readonly skippedDueToLLM: number;
}

/** System prompt for the freshness-review role; prompt-cached so repeated calls are cheap. */
const SYSTEM_PROMPT = `You are a freshness-review assistant for a personal knowledge site.

Given a stale section from a long-form post and recent changes in the wider content tree, draft a "what may have changed" note and recommend an action.

You must return:
- whatMayHaveChanged: one paragraph describing what in the section may no longer be accurate or current.
- recommend: "confirm-still-true" if the section likely still holds, "revise" if it needs updating, "deprecate" if it has been superseded.
- reasoning: one sentence explaining the recommendation.

Do not write the revision itself; recommend only. Call flag_section_freshness exactly once.`;

/** Tool definition for the freshness-review draft. */
const FLAG_TOOL = {
  name: "flag_section_freshness",
  description: "Draft a freshness flag for a stale post section.",
  schema: FreshnessReviewDraft,
};

/** Extract the body of the section starting at the given heading, up to the next same-or-shallower heading. */
function extractSectionBody(markdown: string, headingText: string): string {
  const lines = markdown.split("\n");
  const headingRe = /^(#{1,6})\s+/;

  let depth = 0;
  let start = -1;

  for (let i = 0; i < lines.length; i++) {
    const m = headingRe.exec(lines[i]!);
    if (!m) continue;
    const text = lines[i]!.replace(/\s*\{[^{}]*\}\s*$/, "")
      .replace(/^#{1,6}\s+/, "")
      .trim();
    if (start === -1) {
      if (text === headingText) {
        depth = m[1]!.length;
        start = i;
      }
      continue;
    }
    if (m[1]!.length <= depth) {
      return lines.slice(start, i).join("\n");
    }
  }

  return start === -1 ? "" : lines.slice(start).join("\n");
}

/** Gather recent brain-diff-style entries since `sinceISO` from git history of related paths. */
function recentBrainDiffSince(cwd: string, sinceISO: string): string {
  const trackedDirs = ["content/claims", "content/thoughts"];
  const entries: Array<{ isoDate: string; subject: string; path: string }> = [];
  const since = new Date(sinceISO).getTime();

  for (const dir of trackedDirs) {
    const absDir = join(cwd, dir);
    if (!existsSync(absDir)) continue;
    for (const f of readdirSync(absDir)
      .filter((n) => n.endsWith(".md"))
      .slice(0, 20)) {
      const history = walkFileHistory(cwd, `${dir}/${f}`);
      for (const entry of history) {
        if (new Date(entry.isoDate).getTime() > since && entry.subject) {
          entries.push({ isoDate: entry.isoDate, subject: entry.subject, path: `${dir}/${f}` });
        }
      }
    }
  }

  entries.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());
  return entries
    .slice(0, 15)
    .map((e) => `[${e.isoDate.slice(0, 10)}] ${e.path}: ${e.subject}`)
    .join("\n");
}

/** Build the user-turn prompt for flagging a stale section. */
function buildUserPrompt(
  postSlug: string,
  sectionHeading: string,
  sectionBody: string,
  lastVerifiedISO: string,
  brainDiff: string,
): string {
  const context = [
    `Post: ${postSlug}`,
    `Section: ${sectionHeading}`,
    `Last verified: ${lastVerifiedISO}`,
    `\nSection body:\n${sectionBody.slice(0, 1200)}`,
  ].join("\n");

  const diffText = brainDiff
    ? `\n\nRecent changes in the knowledge tree since ${lastVerifiedISO.slice(0, 10)}:\n${brainDiff}`
    : "";

  return `${context}${diffText}`;
}

/** Scan posts for red-state sections, emit proposals for each stale section. */
export async function runFreshnessReview(args: {
  cwd: string;
  nowISO: string;
  skipLLM: boolean;
  thresholdDays?: number;
}): Promise<FreshnessReviewSummary> {
  const { cwd, nowISO, skipLLM } = args;
  const thresholdDays = args.thresholdDays ?? 90;

  const posts = loadContent("posts", { cwd });
  const existingIds = new Set(readQueue(cwd).map((p) => p.id));

  let scanned = 0;
  let flagged = 0;
  let proposed = 0;
  let deduped = 0;
  let skippedDueToLLM = 0;

  for (const post of posts) {
    scanned++;
    const stamps = parseSectionStamps(post.body);

    for (const stamp of stamps) {
      const { state, daysAgo } = freshnessState(stamp.lastVerifiedISO, nowISO);
      if (state !== "red" && daysAgo < thresholdDays) continue;

      flagged++;

      if (skipLLM) {
        skippedDueToLLM++;
        continue;
      }

      const sectionBody = extractSectionBody(post.body, stamp.headingText);
      const brainDiff = recentBrainDiffSince(cwd, stamp.lastVerifiedISO);

      const draftResult = await runToolCall({
        tier: "balanced",
        maxTokens: 768,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(
          post.slug,
          stamp.headingText,
          sectionBody,
          stamp.lastVerifiedISO,
          brainDiff,
        ),
        tool: FLAG_TOOL,
      });

      if (!draftResult) {
        process.stderr.write(
          `freshness-review: LLM returned no result for ${post.slug}#${stamp.anchor}, skipping\n`,
        );
        skippedDueToLLM++;
        continue;
      }
      const draft = draftResult.data;

      const payload: PostSectionRestampPayload = {
        postSlug: post.slug,
        sectionAnchor: stamp.anchor,
        sectionHeading: stamp.headingText,
        lastVerifiedISO: stamp.lastVerifiedISO,
        daysSinceVerified: daysAgo,
        whatMayHaveChanged: draft.whatMayHaveChanged,
        recommendation: draft.recommend,
        reasoning: draft.reasoning,
      };

      const id = proposalId("freshness-review", "post-section-restamp", post.filePath, {
        lastVerifiedISO: stamp.lastVerifiedISO,
        sectionAnchor: stamp.anchor,
      });

      if (existingIds.has(id)) {
        deduped++;
        continue;
      }

      enqueue(
        {
          id,
          source: "freshness-review",
          type: "post-section-restamp",
          createdAt: nowISO,
          target: post.filePath,
          title: `Restamp ${post.slug}#${stamp.anchor}`,
          preview: `${post.slug} § ${stamp.headingText} — ${daysAgo} days since verified. ${draft.reasoning}`,
          payload,
          provenance: {
            process_id: "freshness-review",
            event_type: "change_scoring",
            actor: { kind: "llm", model: draftResult.model },
            started_at: nowISO,
            source_objects: [objectRef("posts", post.slug)],
            target_objects: [objectRef("posts", post.slug)],
            tags: ["ai", "provenance", "freshness"],
          },
        },
        cwd,
      );
      existingIds.add(id);
      proposed++;
    }
  }

  return { scanned, flagged, proposed, deduped, skippedDueToLLM };
}

/** Handler registered at module load for the review-proposals CLI. */
const handler = {
  type: "post-section-restamp" as const,
  payloadSchema: PostSectionRestampPayload,
  parse(proposal: QueuedProposal): PostSectionRestampPayload {
    return PostSectionRestampPayload.parse(proposal.payload);
  },
  async apply(
    proposal: QueuedProposal & { payload: PostSectionRestampPayload },
    _ctx: HandlerContext,
  ): Promise<string> {
    if (!proposal.target) throw new Error("post-section-restamp apply: missing target path");
    const now = nowISO();

    if (proposal.payload.recommendation === "confirm-still-true") {
      restampSectionVerified(proposal.target, proposal.payload.sectionHeading, now);
      return `${proposal.target}#${proposal.payload.sectionAnchor} → last_verified updated to ${now.slice(0, 10)}`;
    }

    if (proposal.payload.recommendation === "revise") {
      const result = await editMarkdownWithSchema("posts", proposal.target);
      if (!result.ok) throw new Error(`post-section-restamp revise: ${result.reason}`);
      const reread = matter(readFileSync(proposal.target, "utf8"));
      const stamps = parseSectionStamps(reread.content);
      if (!stamps.find((s) => s.anchor === proposal.payload.sectionAnchor)) {
        restampSectionVerified(proposal.target, proposal.payload.sectionHeading, now);
      }
      return `edited and restamped ${proposal.target}#${proposal.payload.sectionAnchor}`;
    }

    deprecateSectionCallout(proposal.target, proposal.payload.sectionHeading);
    return `${proposal.target}#${proposal.payload.sectionAnchor} → deprecated`;
  },
  async edit(
    proposal: QueuedProposal & { payload: PostSectionRestampPayload },
    _ctx: HandlerContext,
  ): Promise<string> {
    if (!proposal.target) throw new Error("post-section-restamp edit: missing target path");
    const result = await editMarkdownWithSchema("posts", proposal.target);
    if (!result.ok) throw new Error(`post-section-restamp edit: ${result.reason}`);
    return `edited ${proposal.target}`;
  },
  reject(
    _proposal: QueuedProposal & { payload: PostSectionRestampPayload },
    _ctx: HandlerContext,
  ): Promise<void> {
    return Promise.resolve();
  },
};

registerHandler(handler);
