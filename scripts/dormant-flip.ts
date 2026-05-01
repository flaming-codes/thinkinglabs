#!/usr/bin/env tsx
import { resolve } from "node:path";
import { nowISO } from "../src/lib/clock.ts";
import { DEFAULT_DORMANT_THRESHOLD_DAYS, runDormantFlip } from "../src/lib/agents/dormant-flip.ts";
import { readQueue } from "../src/lib/proposal-queue.ts";

/** CLI args shape. */
interface Args {
  readonly cwd: string;
  readonly thresholdDays: number;
}

/** Parses CLI args; throws with exitCode 2 on invalid input. */
function parseArgs(argv: ReadonlyArray<string>): Args {
  let cwd = resolve(process.cwd());
  let thresholdDays = (() => {
    const raw = process.env["DORMANT_THRESHOLD_DAYS"];
    const n = raw ? Number(raw) : DEFAULT_DORMANT_THRESHOLD_DAYS;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_DORMANT_THRESHOLD_DAYS;
  })();

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--cwd") {
      const next = argv[i + 1];
      if (!next) throw Object.assign(new Error("--cwd requires a value"), { exitCode: 2 });
      cwd = resolve(next);
      i++;
    } else if (a.startsWith("--cwd=")) {
      cwd = resolve(a.slice("--cwd=".length));
    } else if (a === "--threshold") {
      const next = argv[i + 1];
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
  return { cwd, thresholdDays };
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

main().catch((e: unknown) => {
  const err = e as { message?: string; exitCode?: number };
  process.stderr.write(`${err.message ?? String(e)}\n`);
  process.exit(err.exitCode ?? 1);
});
