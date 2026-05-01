#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyGenericGate,
  buildEntries,
  FEED_PREDICATES,
  formatAtom,
  formatJson,
  walkCommits,
  type FeedEntry,
} from "../src/lib/brain-diff.ts";
import { scoreCommitFiles } from "../src/lib/brain-diff-score.ts";

interface Args {
  since: string;
  out: string;
  noLlm: boolean;
}

/** Tiny argv parser; rejects unknown flags so typos fail fast at the CLI edge. */
function parseArgs(argv: ReadonlyArray<string>): Args {
  const args: Args = { since: "30 days ago", out: "public/feed", noLlm: false };
  for (const a of argv) {
    if (a === "--no-llm") args.noLlm = true;
    else if (a.startsWith("--since=")) args.since = a.slice("--since=".length);
    else if (a.startsWith("--out=")) args.out = a.slice("--out=".length);
    else throw new Error(`unknown arg: ${a}`);
  }
  return args;
}

/** CLI entry: walk commits, optionally score, emit five feed files. */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const useLlm = !args.noLlm && Boolean(process.env["OPENAI_API_KEY"]);
  if (!args.noLlm && !process.env["OPENAI_API_KEY"]) {
    process.stderr.write("OPENAI_API_KEY missing; falling back to --no-llm mode.\n");
  }
  const commits = walkCommits({ since: args.since });
  const scored = useLlm ? await scoreCommitFiles(commits) : undefined;
  const entries: ReadonlyArray<FeedEntry> = buildEntries(commits, scored);
  const outDir = resolve(process.cwd(), args.out);
  mkdirSync(outDir, { recursive: true });

  const generic = applyGenericGate(entries);
  writeFileSync(resolve(outDir, "brain-diff.xml"), formatAtom(generic));
  writeFileSync(resolve(outDir, "brain-diff.json"), formatJson(generic, "brain-diff"));
  for (const [kind, predicate] of Object.entries(FEED_PREDICATES)) {
    writeFileSync(resolve(outDir, `${kind}.json`), formatJson(entries.filter(predicate), kind));
  }
  process.stdout.write(`wrote ${entries.length} entries to ${outDir}\n`);
}

main().catch((e: unknown) => {
  process.stderr.write(`${(e as Error).message ?? String(e)}\n`);
  process.exit(1);
});
