#!/usr/bin/env tsx
import { resolve } from "node:path";
import { nowISO } from "../src/lib/clock.ts";
import { runReviewDecisions } from "../src/lib/agents/review-decisions.ts";
import { readQueue } from "../src/lib/proposal-queue.ts";

/** CLI args shape. */
interface Args {
  readonly cwd: string;
}

/** Parses CLI args; throws with exitCode 2 on invalid input. */
function parseArgs(argv: ReadonlyArray<string>): Args {
  let cwd = resolve(process.cwd());

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--cwd") {
      const next = argv[i + 1];
      if (!next) throw Object.assign(new Error("--cwd requires a value"), { exitCode: 2 });
      cwd = resolve(next);
      i++;
    } else if (a.startsWith("--cwd=")) {
      cwd = resolve(a.slice("--cwd=".length));
    } else {
      throw Object.assign(new Error(`unknown arg: ${a}`), { exitCode: 2 });
    }
  }
  return { cwd };
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

main().catch((e: unknown) => {
  const err = e as { message?: string; exitCode?: number };
  process.stderr.write(`${err.message ?? String(e)}\n`);
  process.exit(err.exitCode ?? 1);
});
