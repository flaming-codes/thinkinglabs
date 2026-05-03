import { readFileSync, renameSync, writeFileSync } from "node:fs";

/** Parses a small JSON state file at the repo root; returns the fallback when the file does not exist. */
export function readJsonState<T>(path: string, fallback: T): T {
  try {
    const raw = readFileSync(path, "utf8");
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      throw new Error(`json-state: malformed JSON in ${path}: ${reason}`);
    }
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return fallback;
    throw e;
  }
}

/** Writes a small JSON state file; pretty-printed for git-friendly diffs. */
export function writeJsonState(path: string, value: unknown): void {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
  renameSync(tmp, path);
}
