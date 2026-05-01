import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { z } from "zod";
import { readJsonState, writeJsonState } from "./json-state.ts";

/** Stable identifier for an agent that emits proposals; literal-union forces an explicit per-agent registration. */
export type ProposalSource =
  | "dormant-flip"
  | "review-decisions"
  | "resolve-predictions"
  | "freshness-review"
  | "triage-questions";

/** Mutation kind; closed union so the dispatcher can switch exhaustively when applying actions. */
export type ProposalType =
  | "project-flip-dormant"
  | "decision-followup-due"
  | "prediction-resolve"
  | "post-section-restamp"
  | "question-answer-curate";

/** One pending proposal emitted by a background agent and awaiting human review. */
export interface QueuedProposal {
  readonly id: string;
  readonly source: ProposalSource;
  readonly type: ProposalType;
  readonly createdAt: string;
  readonly target: string | null;
  readonly title: string;
  readonly preview: string;
  readonly payload: unknown;
}

/** Zod schema for QueuedProposal; validates the queue file at the system edge. */
const queuedProposalSchema = z.object({
  id: z.string(),
  source: z.enum(["dormant-flip", "review-decisions", "resolve-predictions", "freshness-review", "triage-questions"]),
  type: z.enum(["project-flip-dormant", "decision-followup-due", "prediction-resolve", "post-section-restamp", "question-answer-curate"]),
  createdAt: z.string(),
  target: z.string().nullable(),
  title: z.string(),
  preview: z.string(),
  payload: z.unknown(),
});

/** Zod schema for the entire queue file shape. */
const queueFileSchema = z.object({ proposals: z.array(queuedProposalSchema) });

/** Absolute path to the queue file; resolved from cwd so tests can override cwd. */
function queuePath(): string {
  return join(resolve(process.cwd()), ".proposal-queue.json");
}

/** Read all pending proposals in deterministic order (createdAt asc, id tiebreak). */
export function readQueue(): ReadonlyArray<QueuedProposal> {
  const raw = readJsonState<unknown>(queuePath(), { proposals: [] });
  const parsed = queueFileSchema.safeParse(raw);
  if (!parsed.success) {
    process.stderr.write(`proposal-queue: malformed queue file, returning empty queue\n`);
    return [];
  }
  return [...parsed.data.proposals].sort((a, b) => {
    const t = a.createdAt.localeCompare(b.createdAt);
    return t !== 0 ? t : a.id.localeCompare(b.id);
  });
}

/** Append a proposal; idempotent on identical id (no duplicate entries). */
export function enqueue(proposal: QueuedProposal): void {
  const raw = readJsonState<unknown>(queuePath(), { proposals: [] });
  const parsed = queueFileSchema.safeParse(raw);
  const existing = parsed.success ? parsed.data.proposals : [];
  if (existing.some((p) => p.id === proposal.id)) return;
  writeJsonState(queuePath(), { proposals: [...existing, proposal] });
}

/** Remove one proposal by id; no-op if missing. */
export function removeFromQueue(id: string): void {
  const raw = readJsonState<unknown>(queuePath(), { proposals: [] });
  const parsed = queueFileSchema.safeParse(raw);
  if (!parsed.success) return;
  writeJsonState(queuePath(), { proposals: parsed.data.proposals.filter((p) => p.id !== id) });
}

/** Serialises a value to canonical JSON with object keys sorted for determinism across key-insertion orders. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const pairs = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
    return `{${pairs.join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Pure helper computing the deterministic id from canonical JSON of the proposal identity fields. */
export function proposalId(source: ProposalSource, type: ProposalType, target: string | null, payload: unknown): string {
  const canonical = canonicalJson({ payload, source, target, type });
  return createHash("sha256").update(canonical).digest("hex");
}
