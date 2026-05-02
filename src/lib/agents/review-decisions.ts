#!/usr/bin/env tsx
import { z } from "zod";
import { daysBetween } from "../clock.ts";
import { editMarkdownWithSchema } from "../edit-markdown.ts";
import { loadContent } from "../content-repo.ts";
import { enqueue, proposalId, readQueue } from "../proposal-queue.ts";
import { registerHandler, type HandlerContext } from "../proposal-dispatch.ts";
import { readProposalRejections, upsertProposalRejection } from "../proposal-rejections.ts";
import type { QueuedProposal } from "../proposal-queue.ts";

/** Payload carried by a decision-followup-due proposal. */
export const DecisionFollowupPayload = z.object({
  followUpOnISO: z.string(),
  daysOverdue: z.number(),
  decisionTitle: z.string(),
});

/** Inferred type for DecisionFollowupPayload. */
export type DecisionFollowupPayload = z.infer<typeof DecisionFollowupPayload>;

/** Summary returned by runReviewDecisions. */
export interface ReviewDecisionsSummary {
  readonly scanned: number;
  readonly proposed: number;
  readonly deduped: number;
}

/** Shape of one entry in the rejections store. */
interface RejectionEntry {
  readonly slug: string;
  readonly followUpOnISO: string;
}

/** Walks decisions, enqueues follow-up proposals for standing decisions whose follow_up_on has passed. */
export function runReviewDecisions(args: { cwd: string; nowISO: string }): ReviewDecisionsSummary {
  const { cwd, nowISO } = args;
  const decisions = loadContent("decisions", { cwd });
  const standing = decisions.filter((d) => {
    const status = (d.data as { status?: unknown }).status;
    return status === "standing" || status === undefined;
  });

  const rejections = readProposalRejections<RejectionEntry>(cwd, "review-decisions");
  const rejectionMap = new Map(rejections.map((r) => [r.slug, r.followUpOnISO]));

  const existingIds = new Set(readQueue(cwd).map((p) => p.id));

  let proposed = 0;
  let deduped = 0;

  for (const decision of standing) {
    const followUpRaw = (decision.data as { follow_up_on?: unknown }).follow_up_on;
    if (!followUpRaw) continue;
    const followUpOnISO =
      followUpRaw instanceof Date ? followUpRaw.toISOString() : String(followUpRaw);
    if (followUpOnISO > nowISO) continue;

    const rejectedSnapshot = rejectionMap.get(decision.slug);
    if (rejectedSnapshot !== undefined && rejectedSnapshot === followUpOnISO) continue;

    const daysOverdue = daysBetween(followUpOnISO, nowISO);
    const decisionField = (decision.data as { decision?: unknown }).decision;
    const decisionTitle = typeof decisionField === "string" ? decisionField : decision.slug;

    const payload: DecisionFollowupPayload = { followUpOnISO, daysOverdue, decisionTitle };
    const id = proposalId("review-decisions", "decision-followup-due", decision.filePath, {
      followUpOnISO,
    });

    if (existingIds.has(id)) {
      deduped++;
      continue;
    }

    enqueue(
      {
        id,
        source: "review-decisions",
        type: "decision-followup-due",
        createdAt: nowISO,
        target: decision.filePath,
        title: `Review decision: ${decision.slug}`,
        preview: `"${decisionTitle}" — follow_up_on was ${followUpOnISO.slice(0, 10)}, ${daysOverdue} days overdue. Open in editor to confirm or reverse.`,
        payload,
      },
      cwd,
    );
    proposed++;
  }

  return { scanned: standing.length, proposed, deduped };
}

/** Opens the decision file in $EDITOR; apply ≡ edit since the only meaningful action is a human review. */
async function openInEditor(
  proposal: QueuedProposal & { payload: DecisionFollowupPayload },
  _ctx: HandlerContext,
): Promise<string> {
  if (!proposal.target) throw new Error("review-decisions: missing target path");
  const result = await editMarkdownWithSchema("decisions", proposal.target);
  if (!result.ok) throw new Error(`review-decisions: ${result.reason}`);
  return `reviewed ${proposal.target}`;
}

/** Handler registered at module load for the review-proposals CLI. */
const handler = {
  type: "decision-followup-due" as const,
  payloadSchema: DecisionFollowupPayload,
  parse(proposal: QueuedProposal): DecisionFollowupPayload {
    return DecisionFollowupPayload.parse(proposal.payload);
  },
  apply: openInEditor,
  edit: openInEditor,
  async reject(
    proposal: QueuedProposal & { payload: DecisionFollowupPayload },
    ctx: HandlerContext,
  ): Promise<void> {
    if (!proposal.target) return;
    const slug = proposal.target.replace(/.*\//, "").replace(/\.md$/, "");
    upsertProposalRejection(
      ctx.cwd,
      "review-decisions",
      {
        slug,
        followUpOnISO: proposal.payload.followUpOnISO,
      },
      (entry) => entry.slug === slug,
    );
  },
};

registerHandler(handler);
