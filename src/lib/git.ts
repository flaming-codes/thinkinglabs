import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

/** Per-build memoization so multiple renderer call-sites for the same path share one git invocation. */
const cache = new Map<string, Promise<string | null>>();

/** Latest commit ISO date for `filePath`, or null if untracked; mtime fallback is the consumer's responsibility. */
export function lastTouched(filePath: string): Promise<string | null> {
  const cached = cache.get(filePath);
  if (cached) return cached;
  const p = exec("git", ["log", "-1", "--format=%cI", "--", filePath])
    .then(({ stdout }) => {
      const t = stdout.trim();
      return t.length > 0 ? t : null;
    })
    .catch(() => null);
  cache.set(filePath, p);
  return p;
}

/** Synchronous variant for build-time consumers (the index builder); same null-on-untracked semantics, no memoization needed. */
export function lastTouchedSync(filePath: string, cwd: string): string | null {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", filePath], {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/** Run `git` with the given args from `cwd`; returns stdout and lets non-zero exits throw. */
export function git(args: ReadonlyArray<string>, cwd: string): string {
  return execFileSync("git", args as string[], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** Read file content at a given commit, returning null when the path did not exist there. */
export function showAt(cwd: string, ref: string, path: string): string | null {
  try {
    return execFileSync("git", ["show", `${ref}:${path}`], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}
