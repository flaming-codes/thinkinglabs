import { execFile, execFileSync, spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { relative } from "node:path";
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

/** ASCII record separator (0x1E) chosen to never collide with commit dates or path bytes, so one log pass parses unambiguously. */
const LOG_RECORD_SEP = String.fromCharCode(0x1e);

/** One `git log --name-only` pass building repo-relative-path -> latest commit ISO date; mirrors per-file `git log -1` without rename following. */
function lastTouchedMap(cwd: string, scopePaths: ReadonlyArray<string>): Map<string, string> {
  const map = new Map<string, string>();
  if (!isInsideWorkTree(cwd)) return map;
  let out: string;
  try {
    out = execFileSync(
      "git",
      [
        "-c",
        "core.quotePath=false",
        "log",
        "--name-only",
        `--format=${LOG_RECORD_SEP}%cI`,
        "--",
        ...scopePaths,
      ],
      { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1024 * 1024 * 256 },
    );
  } catch {
    return map;
  }
  for (const record of out.split(LOG_RECORD_SEP)) {
    const newline = record.indexOf("\n");
    const iso = (newline === -1 ? record : record.slice(0, newline)).trim();
    if (iso.length === 0) continue;
    if (newline === -1) continue;
    for (const line of record.slice(newline + 1).split("\n")) {
      const path = line.trim();
      if (path.length === 0) continue;
      if (!map.has(path)) map.set(path, iso);
    }
  }
  return map;
}

/** Batched sync last_touched for many files in one git process; returns git date or null per path, leaving the mtime fallback to the consumer. */
export function lastTouchedSyncBatch(
  filePaths: ReadonlyArray<string>,
  cwd: string,
): Map<string, string | null> {
  const result = new Map<string, string | null>();
  if (filePaths.length === 0) return result;
  const relByAbs = new Map<string, string>();
  for (const filePath of filePaths) {
    relByAbs.set(filePath, relative(cwd, filePath).replaceAll("\\", "/"));
  }
  const scope = [...new Set(relByAbs.values())].sort();
  const dateByRel = lastTouchedMap(cwd, scope);
  for (const filePath of filePaths) {
    const rel = relByAbs.get(filePath)!;
    result.set(filePath, dateByRel.get(rel) ?? null);
  }
  return result;
}

/** Batched canonical last_touched for build-time callers: git date when available, otherwise filesystem mtime, in one git pass. */
export function resolvedLastTouchedSyncBatch(
  filePaths: ReadonlyArray<string>,
  cwd: string,
): Map<string, string | null> {
  const gitDates = lastTouchedSyncBatch(filePaths, cwd);
  const result = new Map<string, string | null>();
  for (const filePath of filePaths) {
    result.set(filePath, gitDates.get(filePath) ?? fileMtimeISO(filePath));
  }
  return result;
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

/** Commit metadata parsed from the single `git log` pass, before blob content is attached. */
interface CommitMeta {
  readonly sha: string;
  readonly isoDate: string;
  readonly subject: string;
}

/** Resolve `<sha>:<path>` blobs for every commit in one `git cat-file --batch` process; returns content per index or null where the path was absent. */
function batchBlobContents(
  cwd: string,
  commits: ReadonlyArray<CommitMeta>,
  repoRelativePath: string,
): ReadonlyArray<string | null> {
  const input = `${commits.map((c) => `${c.sha}:${repoRelativePath}`).join("\n")}\n`;
  const result = spawnSync("git", ["cat-file", "--batch"], {
    cwd,
    input: Buffer.from(input, "utf8"),
    maxBuffer: 1024 * 1024 * 256,
  });
  if (result.status !== 0 || !result.stdout) return commits.map(() => null);
  const stdout = result.stdout;
  const contents: Array<string | null> = [];
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset < stdout.length && contents.length < commits.length) {
    const headerEnd = stdout.indexOf(0x0a, offset);
    if (headerEnd === -1) break;
    const header = decoder.decode(stdout.subarray(offset, headerEnd));
    offset = headerEnd + 1;
    if (header.endsWith(" missing")) {
      contents.push(null);
      continue;
    }
    const size = Number.parseInt(header.slice(header.lastIndexOf(" ") + 1), 10);
    if (!Number.isFinite(size)) break;
    contents.push(decoder.decode(stdout.subarray(offset, offset + size)));
    offset += size + 1;
  }
  while (contents.length < commits.length) contents.push(null);
  return contents;
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
  const commits: CommitMeta[] = [];
  for (const line of log.split("\n")) {
    const first = line.indexOf("\t");
    if (first === -1) continue;
    const second = line.indexOf("\t", first + 1);
    if (second === -1) continue;
    commits.push({
      sha: line.slice(0, first).trim(),
      isoDate: line.slice(first + 1, second).trim(),
      subject: line.slice(second + 1).trim(),
    });
  }
  const contents = batchBlobContents(cwd, commits, repoRelativePath);
  const entries: FileHistoryEntry[] = [];
  for (let i = 0; i < commits.length; i++) {
    const content = contents[i];
    if (content === null || content === undefined) continue;
    const { sha, isoDate, subject } = commits[i]!;
    const entry: FileHistoryEntry = subject
      ? { sha, isoDate, content, subject }
      : { sha, isoDate, content };
    entries.push(entry);
  }
  return entries;
}
