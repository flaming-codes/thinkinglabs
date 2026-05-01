#!/usr/bin/env tsx
import { resolve } from "node:path";
import { nowISO } from "../src/lib/clock.ts";
import "../src/lib/agents/freshness-review.ts";
import { runFreshnessReview } from "../src/lib/agents/freshness-review.ts";

/** CLI args shape. */
interface Args {
  readonly cwd: string;
  readonly noLLM: boolean;
  readonly thresholdDays: number;
}

/** Parse CLI args from process.argv; throws with exitCode 2 on invalid input. */
function parseArgs(argv: ReadonlyArray<string>): Args {
  let cwd = resolve(process.cwd());
  let noLLM = false;
  let thresholdDays = 90;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--no-llm") {
      noLLM = true;
    } else if (a === "--cwd") {
      const next = argv[i + 1];
      if (!next) throw Object.assign(new Error("--cwd requires a value"), { exitCode: 2 });
      cwd = resolve(next);
      i++;
    } else if (a.startsWith("--cwd=")) {
      cwd = resolve(a.slice("--cwd=".length));
    } else if (a === "--threshold-days") {
      const next = argv[i + 1];
      if (!next) throw Object.assign(new Error("--threshold-days requires a value"), { exitCode: 2 });
      const n = Number(next);
      if (!Number.isFinite(n) || n < 1) throw Object.assign(new Error(`invalid --threshold-days: ${next}`), { exitCode: 2 });
      thresholdDays = n;
      i++;
    } else if (a.startsWith("--threshold-days=")) {
      const n = Number(a.slice("--threshold-days=".length));
      if (!Number.isFinite(n) || n < 1) throw Object.assign(new Error(`invalid --threshold-days value`), { exitCode: 2 });
      thresholdDays = n;
    } else {
      throw Object.assign(new Error(`unknown arg: ${a}`), { exitCode: 2 });
    }
  }

  return { cwd, noLLM, thresholdDays };
}

/** CLI entry point. */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const skipLLM = args.noLLM || (!process.env["ANTHROPIC_API_KEY"] && (() => {
    process.stderr.write("freshness-review: ANTHROPIC_API_KEY not set, running with --no-llm\n");
    return true;
  })());

  const summary = await runFreshnessReview({
    cwd: args.cwd,
    nowISO: nowISO(),
    skipLLM: Boolean(skipLLM),
    thresholdDays: args.thresholdDays,
  });

  process.stdout.write(
    `scanned ${summary.scanned} items, flagged ${summary.flagged} sections, proposed ${summary.proposed} (deduped ${summary.deduped}), skipped ${summary.skippedDueToLLM} (no LLM)\n`,
  );
}

main().catch((e: unknown) => {
  const err = e as { message?: string; exitCode?: number };
  process.stderr.write(`${err.message ?? String(e)}\n`);
  process.exit(err.exitCode ?? 1);
});
