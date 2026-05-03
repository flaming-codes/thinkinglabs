#!/usr/bin/env tsx
import { nowISO } from "../src/lib/clock.ts";
import { parseCommonArgs, runMain } from "../src/lib/cli.ts";
import { DEFAULT_DORMANT_THRESHOLD_DAYS, runDormantFlip } from "../src/lib/agents/dormant-flip.ts";
import { readQueue } from "../src/lib/proposal-queue.ts";

/** CLI args shape. */
interface Args {
  readonly cwd: string;
  readonly thresholdDays: number;
}

/** Default threshold pulled from env or the agent constant; isolated so parseArgs stays tidy. */
function defaultThreshold(): number {
  const raw = process.env["DORMANT_THRESHOLD_DAYS"];
  const n = raw ? Number(raw) : DEFAULT_DORMANT_THRESHOLD_DAYS;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DORMANT_THRESHOLD_DAYS;
}

/** Parses CLI args; throws with exitCode 2 on invalid input. */
function parseArgs(argv: ReadonlyArray<string>): Args {
  const common = parseCommonArgs(argv);
  let thresholdDays = defaultThreshold();
  for (let i = 0; i < common.rest.length; i++) {
    const a = common.rest[i]!;
    if (a === "--threshold") {
      const next = common.rest[i + 1];
      if (!next) throw Object.assign(new Error("--threshold requires a value"), { exitCode: 2 });
      const n = Number(next);
      if (!Number.isFinite(n) || n < 1)
        throw Object.assign(new Error(`invalid --threshold: ${next}`), { exitCode: 2 });
      thresholdDays = n;
      i++;
    } else if (a.startsWith("--threshold=")) {
      const n = Number(a.slice("--threshold=".length));
      if (!Number.isFinite(n) || n < 1)
        throw Object.assign(new Error(`invalid --threshold value`), { exitCode: 2 });
      thresholdDays = n;
    } else {
      throw Object.assign(new Error(`unknown arg: ${a}`), { exitCode: 2 });
    }
  }
  return { cwd: common.cwd, thresholdDays };
}

/** CLI entry point. */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const summary = runDormantFlip({
    cwd: args.cwd,
    nowISO: nowISO(),
    thresholdDays: args.thresholdDays,
  });
  const queueSize = readQueue(args.cwd).length;
  process.stdout.write(
    `scanned ${summary.scanned} projects, proposed ${summary.proposed} (deduped ${summary.deduped}), queue size now ${queueSize}\n`,
  );
}

runMain(main);
