#!/usr/bin/env tsx
import type { Readable, Writable } from "node:stream";
import "../src/lib/agents/dormant-flip.ts";
import "../src/lib/agents/freshness-review.ts";
import "../src/lib/agents/resolve-predictions.ts";
import "../src/lib/agents/review-decisions.ts";
import "../src/lib/agents/triage-questions.ts";
import { runReview, type ReviewActionDef, type ReviewProposal } from "../src/lib/review-cli.ts";
import { readQueue, removeFromQueue, type QueuedProposal } from "../src/lib/proposal-queue.ts";
import { getHandler, allHandlers } from "../src/lib/proposal-dispatch.ts";
import type { ProposalSource } from "../src/lib/proposal-queue.ts";
import { writeProvenanceEvent } from "../src/lib/provenance.ts";

/** CLI args shape. */
interface Args {
  readonly limit: number;
  readonly filter: ReadonlyArray<ProposalSource>;
  readonly dryRun: boolean;
}

/** Per-run tally for the summary line. */
interface Tally {
  accepted: number;
  edited: number;
  rejected: number;
  skipped: number;
}

/** Parses CLI args from process.argv; throws with exitCode 2 on invalid input. */
function parseArgs(argv: ReadonlyArray<string>): Args {
  let limit = 25;
  const filter: ProposalSource[] = [];
  let dryRun = false;
  const validSources = new Set<string>([
    "dormant-flip",
    "review-decisions",
    "resolve-predictions",
    "freshness-review",
    "triage-questions",
  ]);

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--limit") {
      const next = argv[i + 1];
      if (!next) throw Object.assign(new Error("--limit requires a value"), { exitCode: 2 });
      const n = Number(next);
      if (!Number.isFinite(n) || n < 1)
        throw Object.assign(new Error(`invalid --limit: ${next}`), { exitCode: 2 });
      limit = n;
      i++;
    } else if (a.startsWith("--limit=")) {
      const n = Number(a.slice("--limit=".length));
      if (!Number.isFinite(n) || n < 1)
        throw Object.assign(new Error(`invalid --limit value`), { exitCode: 2 });
      limit = n;
    } else if (a === "--filter") {
      const next = argv[i + 1];
      if (!next) throw Object.assign(new Error("--filter requires a value"), { exitCode: 2 });
      for (const s of next.split(",")) {
        const trimmed = s.trim();
        if (!validSources.has(trimmed))
          throw Object.assign(new Error(`unknown source: ${trimmed}`), { exitCode: 2 });
        filter.push(trimmed as ProposalSource);
      }
      i++;
    } else if (a.startsWith("--filter=")) {
      for (const s of a.slice("--filter=".length).split(",")) {
        const trimmed = s.trim();
        if (!validSources.has(trimmed))
          throw Object.assign(new Error(`unknown source: ${trimmed}`), { exitCode: 2 });
        filter.push(trimmed as ProposalSource);
      }
    } else {
      throw Object.assign(new Error(`unknown arg: ${a}`), { exitCode: 2 });
    }
  }
  return { limit, filter, dryRun };
}

/** Returns unique ProposalTypes that appear in the proposals but have no registered handler. */
function unregisteredTypes(proposals: ReadonlyArray<QueuedProposal>): string[] {
  const missing = new Set<string>();
  for (const p of proposals) {
    try {
      getHandler(p.type);
    } catch {
      missing.add(p.type);
    }
  }
  return [...missing];
}

/** Persist accepted LLM provenance when a queued proposal carries model metadata. */
function writeQueuedProvenance(
  cwd: string,
  proposal: QueuedProposal,
  outcome: "accepted" | "edited",
): void {
  if (!proposal.provenance) return;
  writeProvenanceEvent({
    ...proposal.provenance,
    cwd,
    title: `AI provenance for ${proposal.title}`,
    accepted_at: new Date().toISOString(),
    outcome,
  });
}

/** Summary returned by runProposalsReview. */
export interface ReviewRunSummary {
  readonly accepted: number;
  readonly edited: number;
  readonly rejected: number;
  readonly skipped: number;
  readonly queueSize: number;
}

/** Runs the proposal-review loop against the current queue; supports IO injection for in-process tests. */
export async function runProposalsReview(args: {
  limit?: number;
  filter?: ReadonlyArray<ProposalSource>;
  dryRun?: boolean;
  cwd?: string;
  io?: { input?: Readable; output?: Writable };
}): Promise<ReviewRunSummary> {
  const limit = args.limit ?? 25;
  const filter = args.filter ?? [];
  const dryRun = args.dryRun ?? false;
  const cwd = args.cwd ?? process.cwd();
  const output = args.io?.output ?? process.stdout;

  const allProposals = readQueue(cwd);
  const filtered = allProposals
    .filter((p) => filter.length === 0 || filter.includes(p.source))
    .slice(0, limit);

  const tally: Tally = { accepted: 0, edited: 0, rejected: 0, skipped: 0 };

  if (filtered.length === 0) return { ...tally, queueSize: allProposals.length };

  const missing = unregisteredTypes(filtered);
  if (missing.length > 0)
    throw Object.assign(new Error(`no handler registered for type(s): ${missing.join(", ")}`), {
      exitCode: 2,
    });

  const proposals: ReviewProposal<QueuedProposal>[] = filtered.map((p) => ({
    id: p.id,
    title: p.title,
    preview: p.preview,
    payload: p,
  }));

  const actions: ReviewActionDef<QueuedProposal, string>[] = [
    {
      key: "a",
      label: "accept",
      handle: async (p) => {
        const handler = getHandler(p.type);
        const typed = { ...p, payload: handler.parse(p) };
        if (dryRun) {
          output.write(`[dry-run] would accept: ${p.id}\n`);
        } else {
          const summary = await handler.apply(typed);
          writeQueuedProvenance(cwd, p, "accepted");
          removeFromQueue(p.id, cwd);
          output.write(`accepted: ${summary}\n`);
        }
        tally.accepted++;
        return "accepted";
      },
    },
    {
      key: "e",
      label: "edit",
      handle: async (p) => {
        const handler = getHandler(p.type);
        const typed = { ...p, payload: handler.parse(p) };
        if (dryRun) {
          output.write(`[dry-run] would edit: ${p.id}\n`);
        } else {
          const summary = await handler.edit(typed);
          writeQueuedProvenance(cwd, p, "edited");
          removeFromQueue(p.id, cwd);
          output.write(`edited: ${summary}\n`);
        }
        tally.edited++;
        return "edited";
      },
    },
    {
      key: "r",
      label: "reject",
      handle: async (p) => {
        const handler = getHandler(p.type);
        const typed = { ...p, payload: handler.parse(p) };
        if (dryRun) {
          output.write(`[dry-run] would reject: ${p.id}\n`);
        } else {
          if (handler.reject) await handler.reject(typed);
          removeFromQueue(p.id, cwd);
        }
        tally.rejected++;
        return "rejected";
      },
    },
    {
      key: "s",
      label: "skip",
      handle: (p) => {
        if (dryRun) output.write(`[dry-run] would skip: ${p.id}\n`);
        tally.skipped++;
        return Promise.resolve("skipped");
      },
    },
  ];

  await runReview(proposals, actions, args.io);
  return { ...tally, queueSize: readQueue(cwd).length };
}

/** CLI entry point; thin wrapper around runProposalsReview that adds SIGINT handling and summary output. */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const initialQueue = readQueue();
  const filtered = initialQueue.filter(
    (p) => args.filter.length === 0 || args.filter.includes(p.source),
  );

  if (filtered.length === 0) {
    process.stdout.write(`0 proposals\n`);
    return;
  }

  const missing = unregisteredTypes(filtered.slice(0, args.limit));
  if (missing.length > 0) {
    process.stderr.write(
      `review-proposals: no handler registered for type(s): ${missing.join(", ")}\n`,
    );
    process.exit(2);
  }

  const handlers = allHandlers();
  void handlers;

  const tally = { accepted: 0, edited: 0, rejected: 0, skipped: 0 };
  const handleSignal = (): void => {
    process.stdout.write(
      `\nAborted. ${tally.accepted} accepted, ${tally.edited} edited, ${tally.rejected} rejected, ${tally.skipped} skipped, queue size now ${readQueue().length}\n`,
    );
    process.exit(1);
  };
  process.once("SIGINT", handleSignal);

  const summary = await runProposalsReview({
    limit: args.limit,
    filter: args.filter,
    dryRun: args.dryRun,
  });
  tally.accepted = summary.accepted;
  tally.edited = summary.edited;
  tally.rejected = summary.rejected;
  tally.skipped = summary.skipped;

  process.stdout.write(
    `${summary.accepted} accepted, ${summary.edited} edited, ${summary.rejected} rejected, ${summary.skipped} skipped, queue size now ${summary.queueSize}\n`,
  );
}

main().catch((e: unknown) => {
  const err = e as { message?: string; exitCode?: number };
  process.stderr.write(`${err.message ?? String(e)}\n`);
  process.exit(err.exitCode ?? 1);
});
