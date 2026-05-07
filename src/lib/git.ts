import { execFile, execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { promisify } from "node:util";

const exec = promisify(execFile);

/** Per-build memoization so multiple renderer call-sites for the same path share one git invocation. */
const cache = new Map<string, Promise<string | null>>();
const workTreeCache = new Map<string, boolean>();

function cacheKey(filePath: string, cwd: string): string {
  return `${cwd}\u0000${filePath}`;
}

function fileMtimeISO(filePath: string): string | null {
  try {
    return statSync(filePath).mtime.toISOString();
  } catch {
    return null;
  }
}

function isInsideWorkTree(cwd: string): boolean {
  const cached = workTreeCache.get(cwd);
  if (cached !== undefined) return cached;
  let inside = false;
  try {
    inside =
      execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
        cwd,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      }).trim() === "true";
  } catch {
    inside = false;
  }
  workTreeCache.set(cwd, inside);
  return inside;
}

/** Latest commit ISO date for `filePath`, or null if untracked; mtime fallback is the consumer's responsibility. */
export function lastTouched(filePath: string, cwd = process.cwd()): Promise<string | null> {
  const key = cacheKey(filePath, cwd);
  const cached = cache.get(key);
  if (cached) return cached;
  const p = exec("git", ["log", "-1", "--format=%cI", "--", filePath], { cwd })
    .then(({ stdout }) => {
      const t = stdout.trim();
      return t.length > 0 ? t : null;
    })
    .catch(() => null);
  cache.set(key, p);
  return p;
}

/** Synchronous variant for build-time consumers (the index builder); same null-on-untracked semantics, no memoization needed. */
export function lastTouchedSync(filePath: string, cwd: string): string | null {
  if (!isInsideWorkTree(cwd)) return null;
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

/** Canonical last_touched resolution: git date when available, otherwise filesystem mtime. */
export async function resolvedLastTouched(
  filePath: string,
  cwd = process.cwd(),
): Promise<string | null> {
  return (await lastTouched(filePath, cwd)) ?? fileMtimeISO(filePath);
}

/** Synchronous canonical last_touched resolution for build-time callers. */
export function resolvedLastTouchedSync(filePath: string, cwd: string): string | null {
  return lastTouchedSync(filePath, cwd) ?? fileMtimeISO(filePath);
}

/** Run `git` with the given args from `cwd`; returns stdout and lets non-zero exits throw. */
export function git(args: ReadonlyArray<string>, cwd: string): string {
  return execFileSync("git", args as string[], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Read file content at a given commit, returning null when the path did not exist there. */
export function showAt(cwd: string, ref: string, path: string): string | null {
  try {
    return execFileSync("git", ["show", `${ref}:${path}`], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

/** Commit shape returned by walkFileHistory; content is the raw file bytes at that revision. */
export interface FileHistoryEntry {
  readonly sha: string;
  readonly isoDate: string;
  readonly content: string;
  /** Git commit subject line; populated by walkFileHistory so callers can surface "what changed". */
  readonly subject?: string;
}

/** Walk every commit that touched `repoRelativePath`, oldest-first; returns [] on any git error so new/untracked files are silent. */
export function walkFileHistory(
  cwd: string,
  repoRelativePath: string,
): ReadonlyArray<FileHistoryEntry> {
  let log: string;
  try {
    log = execFileSync(
      "git",
      ["log", "--reverse", "--format=%H%x09%cI%x09%s", "--", repoRelativePath],
      { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    return [];
  }
  if (!log) return [];
  const entries: FileHistoryEntry[] = [];
  for (const line of log.split("\n")) {
    const first = line.indexOf("\t");
    if (first === -1) continue;
    const second = line.indexOf("\t", first + 1);
    if (second === -1) continue;
    const sha = line.slice(0, first).trim();
    const isoDate = line.slice(first + 1, second).trim();
    const subject = line.slice(second + 1).trim();
    const content = showAt(cwd, sha, repoRelativePath);
    if (content === null) continue;
    const entry: FileHistoryEntry = subject
      ? { sha, isoDate, content, subject }
      : { sha, isoDate, content };
    entries.push(entry);
  }
  return entries;
}
