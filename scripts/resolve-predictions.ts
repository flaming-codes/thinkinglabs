#!/usr/bin/env tsx
import { nowISO } from "../src/lib/clock.ts";
import "../src/lib/agents/resolve-predictions.ts";
import { runResolvePredictions } from "../src/lib/agents/resolve-predictions.ts";
import { parseCommonArgs, resolveLlmMode, runMain } from "../src/lib/cli.ts";

/** CLI args shape. */
interface Args {
  readonly cwd: string;
  readonly noLlm: boolean;
}

/** Parse CLI args from process.argv; throws with exitCode 2 on invalid input. */
function parseArgs(argv: ReadonlyArray<string>): Args {
  const common = parseCommonArgs(argv);
  for (const a of common.rest) {
    throw Object.assign(new Error(`unknown arg: ${a}`), { exitCode: 2 });
  }
  return { cwd: common.cwd, noLlm: common.noLlm };
}

/** CLI entry point. */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const mode = resolveLlmMode("resolve-predictions", args.noLlm);

  const summary = await runResolvePredictions({
    cwd: args.cwd,
    nowISO: nowISO(),
    skipLLM: mode === "no-llm",
  });

  process.stdout.write(
    `scanned ${summary.scanned} items, proposed ${summary.proposed} (deduped ${summary.deduped}), skipped ${summary.skippedDueToLLM} (no LLM)\n`,
  );
}

runMain(main);
