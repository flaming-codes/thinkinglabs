import { resolve } from "node:path";
import { apiKeyName, isLLMAvailable } from "./llm.ts";

/** Parsed common args plus any positional/unknown args left for the caller to handle. */
export interface CommonArgs {
  readonly cwd: string;
  readonly noLlm: boolean;
  readonly rest: ReadonlyArray<string>;
}

/** Parse `--cwd`, `--cwd=<path>`, and `--no-llm` from argv; everything else passes through `rest`. */
export function parseCommonArgs(argv: ReadonlyArray<string>): CommonArgs {
  let cwd = resolve(process.cwd());
  let noLlm = false;
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--no-llm") {
      noLlm = true;
    } else if (a === "--cwd") {
      const next = argv[i + 1];
      if (!next) throw Object.assign(new Error("--cwd requires a value"), { exitCode: 2 });
      cwd = resolve(next);
      i++;
    } else if (a.startsWith("--cwd=")) {
      cwd = resolve(a.slice("--cwd=".length));
    } else {
      rest.push(a);
    }
  }
  return { cwd, noLlm, rest };
}

/** LLM-mode resolution outcome; consumers branch deterministically on the literal. */
export type LlmMode = "llm" | "no-llm";

/** Decide whether to use the LLM for a given agent run; logs to stderr when falling back due to a missing key. */
export function resolveLlmMode(agentName: string, noLlmFlag: boolean): LlmMode {
  if (noLlmFlag) return "no-llm";
  if (isLLMAvailable()) return "llm";
  process.stderr.write(`${agentName}: ${apiKeyName()} not set, running with --no-llm\n`);
  return "no-llm";
}

/** Wrap a script's main with the standard error-to-stderr-and-exit boilerplate. */
export function runMain(main: () => Promise<void>): void {
  main().catch((e: unknown) => {
    const err = e as { message?: string; exitCode?: number };
    process.stderr.write(`${err.message ?? String(e)}\n`);
    process.exit(err.exitCode ?? 1);
  });
}
