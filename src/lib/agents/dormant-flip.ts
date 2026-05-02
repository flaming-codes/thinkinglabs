#!/usr/bin/env tsx
import { z } from "zod";
import { daysBetween } from "../clock.ts";
import { loadContent } from "../content-repo.ts";
import { editMarkdownWithSchema } from "../edit-markdown.ts";
import { patchFrontmatter } from "../frontmatter.ts";
import { resolvedLastTouchedSync } from "../git.ts";
import { enqueue, proposalId, readQueue } from "../proposal-queue.ts";
import { registerHandler, type HandlerContext } from "../proposal-dispatch.ts";
import { readProposalRejections, upsertProposalRejection } from "../proposal-rejections.ts";
import type { QueuedProposal } from "../proposal-queue.ts";

/** Env-configurable dormancy threshold; default 60 days per F3 spec. Override via DORMANT_THRESHOLD_DAYS. */
export const DEFAULT_DORMANT_THRESHOLD_DAYS = 60;

/** Payload carried by a project-flip-dormant proposal. */
export const DormantFlipPayload = z.object({
  daysSinceTouched: z.number(),
  thresholdDays: z.number(),
  lastTouchedISO: z.string().nullable(),
});

/** Inferred type for DormantFlipPayload. */
export type DormantFlipPayload = z.infer<typeof DormantFlipPayload>;

/** Summary returned by runDormantFlip. */
export interface DormantFlipSummary {
  readonly scanned: number;
  readonly proposed: number;
  readonly deduped: number;
}

/** Shape of one entry in the rejections store. */
interface RejectionEntry {
  readonly slug: string;
  readonly lastTouchedISO: string | null;
}

/** Walks projects, enqueues flip proposals for alive projects past the dormancy threshold; dedupes via proposalId. */
export function runDormantFlip(args: {
  cwd: string;
  nowISO: string;
  thresholdDays: number;
}): DormantFlipSummary {
  const { cwd, nowISO, thresholdDays } = args;
  const projects = loadContent("projects", { cwd });
  const alive = projects.filter((p) => (p.data as { status?: unknown }).status === "alive");

  const rejections = readProposalRejections<RejectionEntry>(cwd, "dormant-flip");
  const rejectionMap = new Map(rejections.map((r) => [r.slug, r.lastTouchedISO]));

  const existingIds = new Set(readQueue(cwd).map((p) => p.id));

  let proposed = 0;
  let deduped = 0;

  for (const project of alive) {
    const lastTouchedISO = resolvedLastTouchedSync(project.filePath, cwd);

    const daysSinceTouched = lastTouchedISO ? daysBetween(lastTouchedISO, nowISO) : thresholdDays;
    if (daysSinceTouched < thresholdDays) continue;

    const rejectedSnapshot = rejectionMap.get(project.slug);
    if (rejectedSnapshot !== undefined && rejectedSnapshot === lastTouchedISO) continue;

    const payload: DormantFlipPayload = { daysSinceTouched, thresholdDays, lastTouchedISO };
    const id = proposalId("dormant-flip", "project-flip-dormant", project.filePath, {
      lastTouchedISO,
      thresholdDays,
    });

    if (existingIds.has(id)) {
      deduped++;
      continue;
    }

    enqueue(
      {
        id,
        source: "dormant-flip",
        type: "project-flip-dormant",
        createdAt: nowISO,
        target: project.filePath,
        title: `Flip ${project.slug} dormant`,
        preview: `${project.slug} inactive for ${daysSinceTouched} days (threshold ${thresholdDays}). Proposed: set status = "dormant".`,
        payload,
      },
      cwd,
    );
    proposed++;
  }

  return { scanned: alive.length, proposed, deduped };
}

/** Handler registered at module load for the review-proposals CLI. */
const handler = {
  type: "project-flip-dormant" as const,
  payloadSchema: DormantFlipPayload,
  parse(proposal: QueuedProposal): DormantFlipPayload {
    return DormantFlipPayload.parse(proposal.payload);
  },
  async apply(
    proposal: QueuedProposal & { payload: DormantFlipPayload },
    _ctx: HandlerContext,
  ): Promise<string> {
    if (!proposal.target) throw new Error("dormant-flip apply: missing target path");
    await patchFrontmatter(proposal.target, (data) => {
      data["status"] = "dormant";
    });
    return `${proposal.target} → status: dormant`;
  },
  async edit(
    proposal: QueuedProposal & { payload: DormantFlipPayload },
    _ctx: HandlerContext,
  ): Promise<string> {
    if (!proposal.target) throw new Error("dormant-flip edit: missing target path");
    const result = await editMarkdownWithSchema("projects", proposal.target);
    if (!result.ok) throw new Error(`dormant-flip edit: ${result.reason}`);
    return `edited ${proposal.target}`;
  },
  async reject(
    proposal: QueuedProposal & { payload: DormantFlipPayload },
    ctx: HandlerContext,
  ): Promise<void> {
    if (!proposal.target) return;
    const slug = proposal.target.replace(/.*\//, "").replace(/\.md$/, "");
    upsertProposalRejection(
      ctx.cwd,
      "dormant-flip",
      {
        slug,
        lastTouchedISO: proposal.payload.lastTouchedISO,
      },
      (entry) => entry.slug === slug,
    );
  },
};

registerHandler(handler);
