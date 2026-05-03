#!/usr/bin/env tsx
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { resolvedLastTouched } from "../src/lib/git.ts";

/** CLI: prints last commit ISO date for a file/slug; resolves bare slugs against `content/projects/<slug>.md`. */
async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) {
    process.stderr.write("usage: last-touched <path-or-projects-slug>\n");
    process.exit(2);
  }
  const direct = resolve(process.cwd(), arg);
  const fallback = resolve(process.cwd(), "content/projects", `${arg}.md`);
  const file = existsSync(direct) ? direct : fallback;
  const out = await resolvedLastTouched(file);
  process.stdout.write(`${out ?? "(untracked)"}\n`);
}

main();
