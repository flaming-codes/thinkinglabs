#!/usr/bin/env tsx
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const fixtureRoot = resolve(root, "tests/fixtures/content");
const touched: string[] = [];

function pnpmCmd(): string {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function copyFixtures(): void {
  const pairs = [
    ["thoughts/_seed.md", "content/thoughts/_seed.md"],
    ["claims/_seed.md", "content/claims/_seed.md"],
    ["projects/_seed.md", "content/projects/_seed.md"],
    ["predictions/_seed.md", "content/predictions/_seed.md"],
    ["changed-my-mind/_seed.md", "content/changed-my-mind/_seed.md"],
    ["decisions/_seed.md", "content/decisions/_seed.md"],
    ["questions/_seed.md", "content/questions/_seed.md"],
    ["posts/_seed.md", "content/posts/_seed.md"],
    ["inputs/_seed.md", "content/inputs/_seed.md"],
  ] as const;
  for (const [from, to] of pairs) {
    const dst = resolve(root, to);
    if (existsSync(dst)) throw new Error(`fixture target already exists: ${to}`);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(join(fixtureRoot, from), dst);
    touched.push(dst);
  }
}

try {
  copyFixtures();
  execFileSync(pnpmCmd(), ["build"], { cwd: root, stdio: "inherit" });
} finally {
  for (const file of touched.reverse()) rmSync(file, { force: true });
}
