import { readFileSync } from "node:fs";
import matter from "gray-matter";
import { z } from "zod";
import { runToolCall } from "../llm.ts";
import { loadContent } from "../content-repo.ts";
import { editMarkdownWithSchema } from "../edit-markdown.ts";
import { patchFrontmatter } from "../frontmatter.ts";
import { enqueue, proposalId, readQueue } from "../proposal-queue.ts";
import type { QueuedProposal } from "../proposal-queue.ts";
import { registerHandler, type HandlerContext } from "../proposal-dispatch.ts";
import { readProposalRejections, upsertProposalRejection } from "../proposal-rejections.ts";
import { objectRef } from "../provenance.ts";

/** Zod schema for the LLM resolution draft tool output. */
export const ResolutionDraft = z.object({
  resolution: z.enum(["true", "false", "ambiguous"]),
  resolution_note: z.string().min(1),
  reasoning: z.string().min(1),
});

/** Inferred type for ResolutionDraft. */
export type ResolutionDraft = z.infer<typeof ResolutionDraft>;

/** Payload carried by a prediction-resolve proposal. */
export const PredictionResolvePayload = z.object({
  resolution: z.enum(["true", "false", "ambiguous"]),
  resolution_note: z.string(),
  reasoning: z.string(),
  resolvedOnISO: z.string(),
});

/** Inferred type for PredictionResolvePayload. */
export type PredictionResolvePayload = z.infer<typeof PredictionResolvePayload>;

/** Summary returned by runResolvePredictions. */
export interface ResolvePredictionsSummary {
  readonly scanned: number;
  readonly proposed: number;
  readonly deduped: number;
  readonly skippedDueToLLM: number;
}

/** Shape of one entry in the rejections store. */
interface RejectionEntry {
  readonly slug: string;
  readonly predictionLastModified: string;
}

/** System prompt for the resolution-drafting role; prompt-cached so repeated calls are cheap. */
const SYSTEM_PROMPT = `You are a prediction-resolution assistant for a personal calibration ledger.

Given a prediction (text, made-date, resolves-date, confidence, evidence-at-time) and a set of recent inputs and observations from around the resolution window, draft a resolution judgment.

Your judgment must be:
- resolution: "true" if the prediction came true, "false" if it did not, "ambiguous" if the evidence is genuinely unclear.
- resolution_note: one concise sentence summarising the outcome (this will be displayed publicly).
- reasoning: one sentence explaining the evidence that drove your judgment (surfaced in the review preview, not persisted).

Be conservative: choose "ambiguous" when the outcome is genuinely unclear rather than forcing a binary verdict. Base your judgment only on what can be inferred from the provided context.

Call draft_resolution exactly once.`;

/** Tool definition for the resolution draft. */
const DRAFT_TOOL = {
  name: "draft_resolution",
  description: "Draft a resolution judgment for a pending prediction.",
  schema: ResolutionDraft,
};

/** Normalise a raw frontmatter date to an ISO string. */
function rawToISO(raw: unknown): string {
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === "string") return raw;
  return "";
}

/** Build the user-turn prompt with prediction context and recent evidence. */
function buildUserPrompt(
  predData: Record<string, unknown>,
  recentEvidence: Array<{
    kind: "input" | "observation";
    slug: string;
    body: string;
    iso: string;
  }>,
): string {
  const ctx = [
    `prediction: ${String(predData["prediction"] ?? "")}`,
    `made: ${rawToISO(predData["made"])}`,
    `resolves: ${rawToISO(predData["resolves"])}`,
    `confidence: ${String(predData["confidence"] ?? "")}`,
    `evidence_at_time: ${JSON.stringify(predData["evidence_at_time"] ?? [])}`,
  ].join("\n");

  const evidenceText =
    recentEvidence.length > 0
      ? `\n\nRecent evidence from the prediction window:\n${recentEvidence.map((i) => `[${i.kind}/${i.slug} — ${i.iso}]\n${i.body.slice(0, 600)}`).join("\n\n---\n\n")}`
      : "";

  return `Prediction:\n${ctx}${evidenceText}`;
}

/** Walk predictions dir, call LLM for each pending+overdue prediction, enqueue proposals. */
export async function runResolvePredictions(args: {
  cwd: string;
  nowISO: string;
  skipLLM: boolean;
}): Promise<ResolvePredictionsSummary> {
  const { cwd, nowISO, skipLLM } = args;
  const predictions = loadContent("predictions", { cwd });
  const inputs = loadContent("inputs", { cwd });
  const observations = loadContent("observations", { cwd });

  const rejections = readProposalRejections<RejectionEntry>(cwd, "resolve-predictions");
  const rejectionMap = new Map(rejections.map((r) => [r.slug, r.predictionLastModified]));

  const now = new Date(nowISO).getTime();
  const existingIds = new Set(readQueue(cwd).map((p) => p.id));

  let proposed = 0;
  let deduped = 0;
  let skippedDueToLLM = 0;
  let scanned = 0;

  for (const pred of predictions) {
    const predData = pred.data as Record<string, unknown>;
    const resolution = predData["resolution"];
    if (resolution !== "pending") continue;

    const resolvesISO = rawToISO(predData["resolves"]);
    if (!resolvesISO || new Date(resolvesISO).getTime() > now) continue;

    scanned++;

    const madeISO = rawToISO(predData["made"]);

    const rejectedSnapshot = rejectionMap.get(pred.slug);
    if (rejectedSnapshot !== undefined) {
      const currentModified = rawToISO(predData["updated"]) || madeISO;
      if (rejectedSnapshot === currentModified) continue;
    }

    const windowInputs = inputs
      .filter((i) => {
        const inputData = i.data as Record<string, unknown>;
        const consumedISO = rawToISO(inputData["consumed"]);
        if (!consumedISO) return false;
        const t = new Date(consumedISO).getTime();
        return t >= new Date(madeISO).getTime() && t <= new Date(resolvesISO).getTime();
      })
      .sort((a, b) => {
        const aISO = rawToISO((a.data as Record<string, unknown>)["consumed"]);
        const bISO = rawToISO((b.data as Record<string, unknown>)["consumed"]);
        return new Date(bISO).getTime() - new Date(aISO).getTime();
      })
      .slice(0, 10);

    const windowObservations = observations
      .filter((observation) => {
        const observationData = observation.data as Record<string, unknown>;
        const observedISO = rawToISO(observationData["observed"]);
        if (!observedISO) return false;
        const t = new Date(observedISO).getTime();
        return t >= new Date(madeISO).getTime() && t <= new Date(resolvesISO).getTime();
      })
      .sort((a, b) => {
        const aISO = rawToISO((a.data as Record<string, unknown>)["observed"]);
        const bISO = rawToISO((b.data as Record<string, unknown>)["observed"]);
        return new Date(bISO).getTime() - new Date(aISO).getTime();
      })
      .slice(0, 10);

    const windowEvidence = [
      ...windowInputs.map((input) => ({
        kind: "input" as const,
        slug: input.slug,
        body: input.body,
        iso: rawToISO((input.data as Record<string, unknown>)["consumed"]),
      })),
      ...windowObservations.map((observation) => ({
        kind: "observation" as const,
        slug: observation.slug,
        body: observation.body,
        iso: rawToISO((observation.data as Record<string, unknown>)["observed"]),
      })),
    ]
      .sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime())
      .slice(0, 10);

    if (skipLLM) {
      skippedDueToLLM++;
      continue;
    }

    const draftResult = await runToolCall({
      tier: "balanced",
      maxTokens: 1024,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(predData, windowEvidence),
      tool: DRAFT_TOOL,
    });

    if (!draftResult) {
      process.stderr.write(
        `resolve-predictions: LLM returned no result for ${pred.slug}, skipping\n`,
      );
      skippedDueToLLM++;
      continue;
    }
    const draft = draftResult.data;

    const payload: PredictionResolvePayload = {
      resolution: draft.resolution,
      resolution_note: draft.resolution_note,
      reasoning: draft.reasoning,
      resolvedOnISO: nowISO,
    };

    const id = proposalId("resolve-predictions", "prediction-resolve", pred.filePath, {
      madeISO,
      prediction: String(predData["prediction"] ?? ""),
      resolvesISO,
    });

    if (existingIds.has(id)) {
      deduped++;
      continue;
    }

    enqueue(
      {
        id,
        source: "resolve-predictions",
        type: "prediction-resolve",
        createdAt: nowISO,
        target: pred.filePath,
        title: `Resolve prediction: ${pred.slug}`,
        preview: `${pred.slug} resolves as ${draft.resolution}. ${draft.reasoning}`,
        payload,
        provenance: {
          process_id: "resolve-predictions",
          event_type: "content_resolution",
          actor: { kind: "llm", model: draftResult.model },
          started_at: nowISO,
          source_objects: [
            objectRef("predictions", pred.slug),
            ...windowEvidence.map((evidence) =>
              objectRef(evidence.kind === "input" ? "inputs" : "observations", evidence.slug),
            ),
          ],
          target_objects: [objectRef("predictions", pred.slug)],
          tags: ["ai", "provenance", "predictions"],
        },
      },
      cwd,
    );
    existingIds.add(id);
    proposed++;
  }

  return { scanned, proposed, deduped, skippedDueToLLM };
}

/** Handler registered at module load for the review-proposals CLI. */
const handler = {
  type: "prediction-resolve" as const,
  payloadSchema: PredictionResolvePayload,
  parse(proposal: QueuedProposal): PredictionResolvePayload {
    return PredictionResolvePayload.parse(proposal.payload);
  },
  async apply(
    proposal: QueuedProposal & { payload: PredictionResolvePayload },
    _ctx: HandlerContext,
  ): Promise<string> {
    if (!proposal.target) throw new Error("prediction-resolve apply: missing target path");
    await patchFrontmatter(proposal.target, (data) => {
      data["resolution"] = proposal.payload.resolution;
      data["resolution_note"] = proposal.payload.resolution_note;
      data["resolved_on"] = proposal.payload.resolvedOnISO.slice(0, 10);
    });
    return `${proposal.target} → resolution: ${proposal.payload.resolution}`;
  },
  async edit(
    proposal: QueuedProposal & { payload: PredictionResolvePayload },
    _ctx: HandlerContext,
  ): Promise<string> {
    if (!proposal.target) throw new Error("prediction-resolve edit: missing target path");
    const result = await editMarkdownWithSchema("predictions", proposal.target);
    if (!result.ok) throw new Error(`prediction-resolve edit: ${result.reason}`);
    return `edited ${proposal.target}`;
  },
  async reject(
    proposal: QueuedProposal & { payload: PredictionResolvePayload },
    ctx: HandlerContext,
  ): Promise<void> {
    if (!proposal.target) return;
    const slug = proposal.target.replace(/.*\//, "").replace(/\.md$/, "");
    let predictionLastModified = "";
    try {
      const raw = readFileSync(proposal.target, "utf8");
      const { data } = matter(raw);
      predictionLastModified =
        rawToISO(data["updated"]) || rawToISO(data["made"]) || new Date().toISOString();
    } catch {
      predictionLastModified = new Date().toISOString();
    }
    upsertProposalRejection(
      ctx.cwd,
      "resolve-predictions",
      {
        slug,
        predictionLastModified,
      },
      (entry) => entry.slug === slug,
    );
  },
};

registerHandler(handler);
