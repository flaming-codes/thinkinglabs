#!/usr/bin/env tsx
import { nowISO } from "../src/lib/clock.ts";
import "../src/lib/agents/freshness-review.ts";
import { runFreshnessReview } from "../src/lib/agents/freshness-review.ts";
import { parseCommonArgs, resolveLlmMode, runMain } from "../src/lib/cli.ts";

/** CLI args shape. */
interface Args {
  readonly cwd: string;
  readonly noLlm: boolean;
  readonly thresholdDays: number;
}

/** Parse CLI args from process.argv; throws with exitCode 2 on invalid input. */
function parseArgs(argv: ReadonlyArray<string>): Args {
  const common = parseCommonArgs(argv);
  let thresholdDays = 90;
  for (let i = 0; i < common.rest.length; i++) {
    const a = common.rest[i]!;
    if (a === "--threshold-days") {
      const next = common.rest[i + 1];
      if (!next)
        throw Object.assign(new Error("--threshold-days requires a value"), { exitCode: 2 });
      const n = Number(next);
      if (!Number.isFinite(n) || n < 1)
        throw Object.assign(new Error(`invalid --threshold-days: ${next}`), { exitCode: 2 });
      thresholdDays = n;
      i++;
    } else if (a.startsWith("--threshold-days=")) {
      const n = Number(a.slice("--threshold-days=".length));
      if (!Number.isFinite(n) || n < 1)
        throw Object.assign(new Error(`invalid --threshold-days value`), { exitCode: 2 });
      thresholdDays = n;
    } else {
      throw Object.assign(new Error(`unknown arg: ${a}`), { exitCode: 2 });
    }
  }
  return { cwd: common.cwd, noLlm: common.noLlm, thresholdDays };
}

/** CLI entry point. */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const mode = resolveLlmMode("freshness-review", args.noLlm);

  const summary = await runFreshnessReview({
    cwd: args.cwd,
    nowISO: nowISO(),
    skipLLM: mode === "no-llm",
    thresholdDays: args.thresholdDays,
  });

  process.stdout.write(
    `scanned ${summary.scanned} items, flagged ${summary.flagged} sections, proposed ${summary.proposed} (deduped ${summary.deduped}), skipped ${summary.skippedDueToLLM} (no LLM)\n`,
  );
}

runMain(main);
