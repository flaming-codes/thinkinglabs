#!/usr/bin/env tsx
import { resolve } from "node:path";
import { nowISO } from "../src/lib/clock.ts";
import { runTriageQuestions } from "../src/lib/agents/triage-questions.ts";

/** CLI entry point for the triage-questions agent; supports --no-llm and --cwd. */
async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let cwdArg = resolve(process.cwd());
  let skipLLM = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--no-llm") { skipLLM = true; }
    else if (a === "--cwd") { cwdArg = resolve(argv[++i] ?? process.cwd()); }
    else if (a.startsWith("--cwd=")) { cwdArg = resolve(a.slice("--cwd=".length)); }
  }
  if (!skipLLM && !process.env["ANTHROPIC_API_KEY"]) {
    process.stderr.write("triage-questions: ANTHROPIC_API_KEY not set, running with --no-llm\n");
    skipLLM = true;
  }
  const summary = await runTriageQuestions({ cwd: cwdArg, nowISO: nowISO(), skipLLM });
  process.stdout.write(
    `scanned ${summary.scanned} submissions, valid ${summary.valid}, invalidMoved ${summary.invalidMoved}, orphanedMoved ${summary.orphanedMoved}, scoredBelow ${summary.scoredBelow}, proposed ${summary.proposed}, deduped ${summary.deduped}\n`,
  );
}

main().catch((e: unknown) => {
  process.stderr.write(`${(e as Error).message ?? String(e)}\n`);
  process.exit(1);
});
