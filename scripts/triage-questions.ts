#!/usr/bin/env tsx
import { nowISO } from "../src/lib/clock.ts";
import { runTriageQuestions } from "../src/lib/agents/triage-questions.ts";
import { parseCommonArgs, resolveLlmMode, runMain } from "../src/lib/cli.ts";

/** CLI args shape. */
interface Args {
  readonly cwd: string;
  readonly noLlm: boolean;
}

/** Parses CLI args; throws with exitCode 2 on invalid input. */
function parseArgs(argv: ReadonlyArray<string>): Args {
  const common = parseCommonArgs(argv);
  for (const a of common.rest) {
    throw Object.assign(new Error(`unknown arg: ${a}`), { exitCode: 2 });
  }
  return { cwd: common.cwd, noLlm: common.noLlm };
}

/** CLI entry point for the triage-questions agent; supports --no-llm and --cwd. */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const mode = resolveLlmMode("triage-questions", args.noLlm);
  const summary = await runTriageQuestions({
    cwd: args.cwd,
    nowISO: nowISO(),
    skipLLM: mode === "no-llm",
  });
  process.stdout.write(
    `scanned ${summary.scanned} submissions, valid ${summary.valid}, invalidMoved ${summary.invalidMoved}, orphanedMoved ${summary.orphanedMoved}, scoredBelow ${summary.scoredBelow}, proposed ${summary.proposed}, deduped ${summary.deduped}\n`,
  );
}

runMain(main);
