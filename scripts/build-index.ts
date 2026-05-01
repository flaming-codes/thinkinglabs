#!/usr/bin/env tsx
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { collectObjects, writeIndex } from "../src/index/builder.ts";

/** CLI entry: walks `content/` and writes `dist/index.sqlite` deterministically. */
function main(): void {
  const repoRoot = resolve(process.cwd());
  const contentRoot = resolve(repoRoot, "content");
  const outFile = resolve(repoRoot, "dist/index.sqlite");
  mkdirSync(dirname(outFile), { recursive: true });
  const objects = collectObjects(contentRoot, repoRoot);
  writeIndex(objects, outFile);
  process.stdout.write(`indexed ${objects.length} objects -> ${outFile}\n`);
}

main();
