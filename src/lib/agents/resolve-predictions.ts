import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { runToolCall } from "../llm.ts";
import { walkMarkdown } from "../walk-content.ts";
import { editInEditor } from "../editor.ts";
import { patchFrontmatter } from "../frontmatter.ts";
import { readJsonState, writeJsonState } from "../json-state.ts";
import { enqueue, proposalId, readQueue } from "../proposal-queue.ts";
import type { QueuedProposal } from "../proposal-queue.ts";
import { registerHandler } from "../proposal-dispatch.ts";
import { predictionSchema } from "../../schemas/prediction.ts";

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

Given a prediction (text, made-date, resolves-date, confidence, evidence-at-time) and a set of recent inputs from around the resolution window, draft a resolution judgment.

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

/** Absolute path to the rejections file; resolved from cwd so tests can override. */
function rejectionsPath(cwd: string): string {
  return join(resolve(cwd), ".resolve-predictions-rejections.json");
}

/** Normalise a raw frontmatter date to an ISO string. */
function rawToISO(raw: unknown): string {
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === "string") return raw;
  return "";
}

/** Build the user-turn prompt with prediction context and recent inputs. */
function buildUserPrompt(
  predData: Record<string, unknown>,
  recentInputs: Array<{ slug: string; content: string }>,
): string {
  const ctx = [
    `prediction: ${String(predData["prediction"] ?? "")}`,
    `made: ${rawToISO(predData["made"])}`,
    `resolves: ${rawToISO(predData["resolves"])}`,
    `confidence: ${String(predData["confidence"] ?? "")}`,
    `evidence_at_time: ${JSON.stringify(predData["evidence_at_time"] ?? [])}`,
  ].join("\n");

  const inputsText =
    recentInputs.length > 0
      ? `\n\nRecent inputs from the prediction window:\n${recentInputs.map((i) => `[input/${i.slug}]\n${i.content.slice(0, 600)}`).join("\n\n---\n\n")}`
      : "";

  return `Prediction:\n${ctx}${inputsText}`;
}

/** Walk predictions dir, call LLM for each pending+overdue prediction, enqueue proposals. */
export async function runResolvePredictions(args: {
  cwd: string;
  nowISO: string;
  skipLLM: boolean;
}): Promise<ResolvePredictionsSummary> {
  const { cwd, nowISO, skipLLM } = args;
  const predictions = walkMarkdown({ cwd, kind: "predictions" });
  const inputs = walkMarkdown({ cwd, kind: "inputs" });

  const rejections = readJsonState<RejectionEntry[]>(rejectionsPath(cwd), []);
  const rejectionMap = new Map(rejections.map((r) => [r.slug, r.predictionLastModified]));

  const now = new Date(nowISO).getTime();
  const existingIds = new Set(readQueue(cwd).map((p) => p.id));

  let proposed = 0;
  let deduped = 0;
  let skippedDueToLLM = 0;
  let scanned = 0;

  for (const pred of predictions) {
    const resolution = pred.data["resolution"];
    if (resolution !== "pending") continue;

    const resolvesISO = rawToISO(pred.data["resolves"]);
    if (!resolvesISO || new Date(resolvesISO).getTime() > now) continue;

    scanned++;

    const madeISO = rawToISO(pred.data["made"]);

    const rejectedSnapshot = rejectionMap.get(pred.slug);
    if (rejectedSnapshot !== undefined) {
      const currentModified = rawToISO(pred.data["updated"]) || madeISO;
      if (rejectedSnapshot === currentModified) continue;
    }

    const windowInputs = inputs
      .filter((i) => {
        const consumedISO = rawToISO(i.data["consumed"]);
        if (!consumedISO) return false;
        const t = new Date(consumedISO).getTime();
        return t >= new Date(madeISO).getTime() && t <= new Date(resolvesISO).getTime();
      })
      .sort(
        (a, b) =>
          new Date(rawToISO(b.data["consumed"])).getTime() -
          new Date(rawToISO(a.data["consumed"])).getTime(),
      )
      .slice(0, 10);

    if (skipLLM) {
      skippedDueToLLM++;
      continue;
    }

    const draft = await runToolCall({
      tier: "balanced",
      maxTokens: 1024,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(pred.data, windowInputs),
      tool: DRAFT_TOOL,
    });

    if (!draft) {
      process.stderr.write(
        `resolve-predictions: LLM returned no result for ${pred.slug}, skipping\n`,
      );
      skippedDueToLLM++;
      continue;
    }

    const payload: PredictionResolvePayload = {
      resolution: draft.resolution,
      resolution_note: draft.resolution_note,
      reasoning: draft.reasoning,
      resolvedOnISO: nowISO,
    };

    const id = proposalId("resolve-predictions", "prediction-resolve", pred.path, {
      madeISO,
      prediction: String(pred.data["prediction"] ?? ""),
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
        target: pred.path,
        title: `Resolve prediction: ${pred.slug}`,
        preview: `${pred.slug} resolves as ${draft.resolution}. ${draft.reasoning}`,
        payload,
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
  async apply(proposal: QueuedProposal & { payload: PredictionResolvePayload }): Promise<string> {
    if (!proposal.target) throw new Error("prediction-resolve apply: missing target path");
    await patchFrontmatter(proposal.target, (data) => {
      data["resolution"] = proposal.payload.resolution;
      data["resolution_note"] = proposal.payload.resolution_note;
      data["resolved_on"] = proposal.payload.resolvedOnISO.slice(0, 10);
    });
    return `${proposal.target} → resolution: ${proposal.payload.resolution}`;
  },
  async edit(proposal: QueuedProposal & { payload: PredictionResolvePayload }): Promise<string> {
    if (!proposal.target) throw new Error("prediction-resolve edit: missing target path");
    const raw = readFileSync(proposal.target, "utf8");
    const edited = await editInEditor(raw, ".md");
    const parsed = matter(edited);
    predictionSchema.parse(parsed.data);
    writeFileSync(proposal.target, edited, "utf8");
    return `edited ${proposal.target}`;
  },
  async reject(proposal: QueuedProposal & { payload: PredictionResolvePayload }): Promise<void> {
    if (!proposal.target) return;
    const slug = proposal.target.replace(/.*\//, "").replace(/\.md$/, "");
    const cwd = resolve(process.cwd());
    let predictionLastModified = "";
    try {
      const raw = readFileSync(proposal.target, "utf8");
      const { data } = matter(raw);
      predictionLastModified =
        rawToISO(data["updated"]) || rawToISO(data["made"]) || new Date().toISOString();
    } catch {
      predictionLastModified = new Date().toISOString();
    }
    const rejections = readJsonState<RejectionEntry[]>(rejectionsPath(cwd), []);
    const filtered = rejections.filter((r) => r.slug !== slug);
    filtered.push({ slug, predictionLastModified });
    writeJsonState(rejectionsPath(cwd), filtered);
  },
};

registerHandler(handler);
