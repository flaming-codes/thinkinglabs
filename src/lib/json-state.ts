import { readFileSync, renameSync, writeFileSync } from "node:fs";

/** Parses a small JSON state file at the repo root; returns the fallback when the file does not exist. */
export function readJsonState<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** Writes a small JSON state file; pretty-printed for git-friendly diffs. */
export function writeJsonState(path: string, value: unknown): void {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
  renameSync(tmp, path);
}
