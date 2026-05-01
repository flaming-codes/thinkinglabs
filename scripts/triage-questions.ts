#!/usr/bin/env tsx
import { resolve } from "node:path";
import { nowISO } from "../src/lib/clock.ts";
import { runTriageQuestions } from "../src/lib/agents/triage-questions.ts";
import { isLLMAvailable, apiKeyName } from "../src/lib/llm.ts";

/** CLI args shape. */
interface Args {
  readonly cwd: string;
  readonly noLLM: boolean;
}

/** Parses CLI args; throws with exitCode 2 on invalid input. */
function parseArgs(argv: ReadonlyArray<string>): Args {
  let cwd = resolve(process.cwd());
  let noLLM = false;
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
    } else {
      throw Object.assign(new Error(`unknown arg: ${a}`), { exitCode: 2 });
    }
  }
  return { cwd, noLLM };
}

/** CLI entry point for the triage-questions agent; supports --no-llm and --cwd. */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  let skipLLM = args.noLLM;
  if (!skipLLM && !isLLMAvailable()) {
    process.stderr.write(`triage-questions: ${apiKeyName()} not set, running with --no-llm\n`);
    skipLLM = true;
  }
  const summary = await runTriageQuestions({ cwd: args.cwd, nowISO: nowISO(), skipLLM });
  process.stdout.write(
    `scanned ${summary.scanned} submissions, valid ${summary.valid}, invalidMoved ${summary.invalidMoved}, orphanedMoved ${summary.orphanedMoved}, scoredBelow ${summary.scoredBelow}, proposed ${summary.proposed}, deduped ${summary.deduped}\n`,
  );
}

main().catch((e: unknown) => {
  const err = e as { message?: string; exitCode?: number };
  process.stderr.write(`${err.message ?? String(e)}\n`);
  process.exit(err.exitCode ?? 1);
});
