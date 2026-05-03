import { join, resolve } from "node:path";
import { z } from "zod";
import { readJsonState, writeJsonState } from "./json-state.ts";

/** Persisted phases for one reviewed proposal so crash-adjacent reruns can avoid replaying effects. */
const proposalReviewPhaseSchema = z.enum(["applying", "applied", "finalized"]);

/** Persisted outcome for one proposal action. */
const proposalReviewOutcomeSchema = z.enum(["accepted", "edited"]);

/** One per-proposal durable replay guard entry. */
const proposalReviewEntrySchema = z.object({
  outcome: proposalReviewOutcomeSchema,
  phase: proposalReviewPhaseSchema,
  provenanceWritten: z.boolean(),
  updatedAt: z.string(),
});

/** Schema for .review-proposals-state.json. */
const proposalReviewStateSchema = z.object({
  entries: z.record(z.string(), proposalReviewEntrySchema),
});

/** Public type for one entry in the persisted review state. */
export type ProposalReviewEntry = z.infer<typeof proposalReviewEntrySchema>;

/** Public type for one review outcome. */
export type ProposalReviewOutcome = z.infer<typeof proposalReviewOutcomeSchema>;

/** Absolute path to the durable review-state file. */
export function proposalReviewStatePath(cwd = process.cwd()): string {
  return join(resolve(cwd), ".review-proposals-state.json");
}

/** Reads and validates the durable review-state file. */
export function readProposalReviewState(
  cwd?: string,
): Readonly<Record<string, ProposalReviewEntry>> {
  const path = proposalReviewStatePath(cwd);
  const raw = readJsonState<unknown>(path, { entries: {} });
  const parsed = proposalReviewStateSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `review-proposals-state: malformed state file at ${path}: ${parsed.error.message}`,
    );
  }
  return parsed.data.entries;
}

/** Writes the durable review-state file. */
function writeProposalReviewState(
  cwd: string | undefined,
  entries: Readonly<Record<string, ProposalReviewEntry>>,
): void {
  writeJsonState(proposalReviewStatePath(cwd), { entries });
}

/** Returns one entry by proposal id, if present. */
export function getProposalReviewEntry(id: string, cwd?: string): ProposalReviewEntry | null {
  const entries = readProposalReviewState(cwd);
  return entries[id] ?? null;
}

/** Start processing one proposal; throws when a previous run left it in an uncertain applying state. */
export function beginProposalReview(
  id: string,
  outcome: ProposalReviewOutcome,
  cwd?: string,
): void {
  const entries = { ...readProposalReviewState(cwd) };
  const existing = entries[id];
  if (existing) {
    if (existing.outcome !== outcome) {
      throw new Error(
        `review-proposals-state: proposal ${id} already recorded as ${existing.outcome}, not ${outcome}`,
      );
    }
    if (existing.phase === "applying") {
      throw new Error(
        `review-proposals-state: proposal ${id} is already in applying phase at ${proposalReviewStatePath(cwd)}; refusing to replay`,
      );
    }
    return;
  }
  entries[id] = {
    outcome,
    phase: "applying",
    provenanceWritten: false,
    updatedAt: new Date().toISOString(),
  };
  writeProposalReviewState(cwd, entries);
}

/** Mark one proposal as applied after handler side effects have completed successfully. */
export function markProposalApplied(
  id: string,
  outcome: ProposalReviewOutcome,
  cwd?: string,
): void {
  const entries = { ...readProposalReviewState(cwd) };
  const existing = entries[id];
  if (!existing) {
    throw new Error(`review-proposals-state: missing state for proposal ${id}`);
  }
  if (existing.outcome !== outcome) {
    throw new Error(
      `review-proposals-state: proposal ${id} outcome mismatch (${existing.outcome} vs ${outcome})`,
    );
  }
  if (existing.phase === "finalized") return;
  entries[id] = { ...existing, phase: "applied", updatedAt: new Date().toISOString() };
  writeProposalReviewState(cwd, entries);
}

/** Mark that proposal provenance has been persisted for this proposal action. */
export function markProposalProvenanceWritten(
  id: string,
  outcome: ProposalReviewOutcome,
  cwd?: string,
): void {
  const entries = { ...readProposalReviewState(cwd) };
  const existing = entries[id];
  if (!existing) {
    throw new Error(`review-proposals-state: missing state for proposal ${id}`);
  }
  if (existing.outcome !== outcome) {
    throw new Error(
      `review-proposals-state: proposal ${id} outcome mismatch (${existing.outcome} vs ${outcome})`,
    );
  }
  if (existing.provenanceWritten) return;
  entries[id] = { ...existing, provenanceWritten: true, updatedAt: new Date().toISOString() };
  writeProposalReviewState(cwd, entries);
}

/** Mark one proposal as fully finalized so reruns only perform no-op cleanup. */
export function markProposalFinalized(
  id: string,
  outcome: ProposalReviewOutcome,
  cwd?: string,
): void {
  const entries = { ...readProposalReviewState(cwd) };
  const existing = entries[id];
  if (!existing) {
    throw new Error(`review-proposals-state: missing state for proposal ${id}`);
  }
  if (existing.outcome !== outcome) {
    throw new Error(
      `review-proposals-state: proposal ${id} outcome mismatch (${existing.outcome} vs ${outcome})`,
    );
  }
  if (existing.phase === "finalized") return;
  entries[id] = { ...existing, phase: "finalized", updatedAt: new Date().toISOString() };
  writeProposalReviewState(cwd, entries);
}
