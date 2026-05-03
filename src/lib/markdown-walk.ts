import { basename, extname, join } from "node:path";
import { readdirSync, statSync } from "node:fs";

/** Options for markdown source walking so callers can opt into intentional filtering differences. */
export interface MarkdownWalkOptions {
  readonly includeDotfiles?: boolean;
  readonly includeSeedFiles?: boolean;
}

/** Recursively walk a root and return sorted markdown files; unreadable paths are skipped. */
export function walkMarkdownFiles(root: string, opts?: MarkdownWalkOptions): string[] {
  const includeDotfiles = opts?.includeDotfiles ?? true;
  const includeSeedFiles = opts?.includeSeedFiles ?? true;

  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!st.isFile() || extname(name) !== ".md") continue;
      const base = basename(name);
      if (!includeDotfiles && base.startsWith(".")) continue;
      if (!includeSeedFiles && base.startsWith("_seed")) continue;
      out.push(full);
    }
  }
  return out.sort();
}
