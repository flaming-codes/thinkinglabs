#!/usr/bin/env tsx
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { KINDS } from "../src/schemas/index.ts";

const root = process.cwd();
const fixtureRoot = resolve(root, "tests/fixtures/content");
const touched: string[] = [];

function pnpmCmd(): string {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

/** Copies every `_seed*.md` file from each fixture kind directory into the live `content/<kind>/` tree. */
function copyFixtures(): void {
  for (const kind of KINDS) {
    const srcDir = join(fixtureRoot, kind);
    if (!existsSync(srcDir)) continue;
    const seeds = readdirSync(srcDir).filter(
      (name) => name.startsWith("_seed") && name.endsWith(".md"),
    );
    for (const seed of seeds) {
      const dst = resolve(root, "content", kind, seed);
      if (existsSync(dst)) throw new Error(`fixture target already exists: ${kind}/${seed}`);
      mkdirSync(dirname(dst), { recursive: true });
      cpSync(join(srcDir, seed), dst);
      touched.push(dst);
    }
  }
}

try {
  copyFixtures();
  execFileSync(pnpmCmd(), ["build"], { cwd: root, stdio: "inherit" });
} finally {
  for (const file of touched.reverse()) rmSync(file, { force: true });
}
