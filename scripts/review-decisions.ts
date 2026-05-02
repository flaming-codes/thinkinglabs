#!/usr/bin/env tsx
import { nowISO } from "../src/lib/clock.ts";
import { runReviewDecisions } from "../src/lib/agents/review-decisions.ts";
import { parseCommonArgs, runMain } from "../src/lib/cli.ts";
import { readQueue } from "../src/lib/proposal-queue.ts";

/** CLI args shape. */
interface Args {
  readonly cwd: string;
}

/** Parses CLI args; throws with exitCode 2 on invalid input. */
function parseArgs(argv: ReadonlyArray<string>): Args {
  const common = parseCommonArgs(argv);
  for (const a of common.rest) {
    throw Object.assign(new Error(`unknown arg: ${a}`), { exitCode: 2 });
  }
  return { cwd: common.cwd };
}

/** CLI entry point. */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const summary = runReviewDecisions({ cwd: args.cwd, nowISO: nowISO() });
  const queueSize = readQueue(args.cwd).length;
  process.stdout.write(
    `scanned ${summary.scanned} decisions, proposed ${summary.proposed} (deduped ${summary.deduped}), queue size now ${queueSize}\n`,
  );
}

runMain(main);
