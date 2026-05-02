import { createHash } from "node:crypto";
import { closeSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { readJsonState, writeJsonState } from "./json-state.ts";
import {
  modelRefSchema,
  objectRefSchema,
  provenanceEventTypeSchema,
} from "../schemas/provenance.ts";
import type { QueuedProvenance } from "./provenance.ts";

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
  readonly provenance?: QueuedProvenance | undefined;
}

/** Zod schema for optional LLM provenance metadata on proposals. */
const queuedProvenanceSchema = z.object({
  process_id: z.enum([
    "dormant-flip",
    "review-decisions",
    "resolve-predictions",
    "freshness-review",
    "triage-questions",
    "derive-claims",
  ]),
  event_type: provenanceEventTypeSchema,
  actor: z.object({ kind: z.literal("llm"), model: modelRefSchema }),
  started_at: z.string(),
  source_objects: z.array(objectRefSchema),
  target_objects: z.array(objectRefSchema),
  tags: z.array(z.string()).optional(),
});

/** Zod schema for QueuedProposal; validates the queue file at the system edge. */
const queuedProposalSchema = z.object({
  id: z.string(),
  source: z.enum([
    "dormant-flip",
    "review-decisions",
    "resolve-predictions",
    "freshness-review",
    "triage-questions",
  ]),
  type: z.enum([
    "project-flip-dormant",
    "decision-followup-due",
    "prediction-resolve",
    "post-section-restamp",
    "question-answer-curate",
  ]),
  createdAt: z.string(),
  target: z.string().nullable(),
  title: z.string(),
  preview: z.string(),
  payload: z.unknown(),
  provenance: queuedProvenanceSchema.optional(),
});

/** Zod schema for the entire queue file shape. */
const queueFileSchema = z.object({ proposals: z.array(queuedProposalSchema) });

/** Absolute path to the queue file; resolved from the supplied repo root or process cwd. */
function queuePath(cwd = process.cwd()): string {
  return join(resolve(cwd), ".proposal-queue.json");
}

/** Exclusive lock file next to the queue so overlapping scheduled agents cannot lose writes. */
function queueLockPath(cwd = process.cwd()): string {
  return join(resolve(cwd), ".proposal-queue.lock");
}

/** Lock files older than this are treated as orphaned (e.g. crashed agent) and forcibly cleared. */
const STALE_LOCK_MS = 30_000;

/** Reads the pid stamped into a lock file; returns null on missing/unreadable/non-numeric content. */
function readLockPid(lock: string): number | null {
  try {
    const raw = readFileSync(lock, "utf8").trim();
    const pid = Number.parseInt(raw, 10);
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/** Returns true when a numeric pid still maps to a running process on this host. */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    return code === "EPERM";
  }
}

/** Best-effort removal of a stale or orphaned lock; tolerates concurrent unlink races. */
function clearStaleLock(lock: string): void {
  try {
    const stat = statSync(lock);
    const ageMs = Date.now() - stat.mtimeMs;
    const pid = readLockPid(lock);
    const ownerAlive = pid !== null && isProcessAlive(pid);
    if (!ownerAlive || ageMs > STALE_LOCK_MS) {
      try {
        unlinkSync(lock);
      } catch {
        /* raced with another cleaner */
      }
    }
  } catch {
    /* lock file vanished between attempts */
  }
}

/** Runs a synchronous queue mutation behind a short exclusive file lock with crash recovery. */
function withQueueLock<T>(cwd: string | undefined, fn: () => T): T {
  const lock = queueLockPath(cwd);
  const started = Date.now();
  let fd: number | null = null;
  let attempts = 0;
  while (fd === null) {
    try {
      fd = openSync(lock, "wx");
      try {
        writeFileSync(fd, String(process.pid));
      } catch {
        /* pid stamp is advisory */
      }
    } catch {
      attempts++;
      const waited = Date.now() - started;
      if (waited > 5_000) {
        clearStaleLock(lock);
        throw new Error(`proposal-queue: timed out waiting for ${lock}`);
      }
      if (attempts % 10 === 0) clearStaleLock(lock);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  try {
    return fn();
  } finally {
    try {
      closeSync(fd);
    } catch {
      /* fd may have been closed by signal handler */
    }
    try {
      unlinkSync(lock);
    } catch {
      /* lock already gone */
    }
  }
}

/** Read all pending proposals in deterministic order (createdAt asc, id tiebreak). */
export function readQueue(cwd?: string): ReadonlyArray<QueuedProposal> {
  const raw = readJsonState<unknown>(queuePath(cwd), { proposals: [] });
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
export function enqueue(proposal: QueuedProposal, cwd?: string): void {
  withQueueLock(cwd, () => {
    const raw = readJsonState<unknown>(queuePath(cwd), { proposals: [] });
    const parsed = queueFileSchema.safeParse(raw);
    const existing = parsed.success ? parsed.data.proposals : [];
    if (existing.some((p) => p.id === proposal.id)) return;
    writeJsonState(queuePath(cwd), { proposals: [...existing, proposal] });
  });
}

/** Remove one proposal by id; no-op if missing. */
export function removeFromQueue(id: string, cwd?: string): void {
  withQueueLock(cwd, () => {
    const raw = readJsonState<unknown>(queuePath(cwd), { proposals: [] });
    const parsed = queueFileSchema.safeParse(raw);
    if (!parsed.success) return;
    writeJsonState(queuePath(cwd), { proposals: parsed.data.proposals.filter((p) => p.id !== id) });
  });
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
export function proposalId(
  source: ProposalSource,
  type: ProposalType,
  target: string | null,
  payload: unknown,
): string {
  const canonical = canonicalJson({ payload, source, target, type });
  return createHash("sha256").update(canonical).digest("hex");
}
