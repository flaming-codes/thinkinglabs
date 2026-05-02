import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import type { Kind } from "../schemas/index.ts";

/** One walked entry; `data` is raw frontmatter, `content` is body markdown. */
export interface WalkedEntry {
  readonly slug: string;
  readonly path: string;
  readonly data: Record<string, unknown>;
  readonly content: string;
}

/** @deprecated Single-level untyped walker that drops parse errors; use `loadContent` from `@/lib/content-repo`. */
export function walkMarkdownRaw(args: { cwd: string; kind: Kind }): ReadonlyArray<WalkedEntry> {
  const dir = join(resolve(args.cwd), "content", args.kind);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith(".") && !f.startsWith("_seed"))
    .flatMap((f) => {
      try {
        const p = join(dir, f);
        const raw = readFileSync(p, "utf8");
        const { data, content } = matter(raw);
        return [{ slug: f.slice(0, -3), path: p, data: data as Record<string, unknown>, content }];
      } catch {
        return [];
      }
    });
}

/** @deprecated Transition alias for `walkMarkdownRaw`; prefer `loadContent` from `@/lib/content-repo`. */
export const walkMarkdown = walkMarkdownRaw;
