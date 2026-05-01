import matter from "gray-matter";
import type { FileHistoryEntry } from "./git.ts";

/** Parsed snapshot of a claim's frontmatter at a single git revision. */
export interface ClaimHistoryEntry {
  readonly sha: string;
  readonly isoDate: string;
  readonly confidence: number;
  readonly evidenceCount: number;
  readonly opposingCount: number;
  readonly status: string;
}

/** Parse walkFileHistory output into typed snapshots; entries with unparsable frontmatter are silently skipped — partial history is better than a render crash. */
export function parseClaimHistory(entries: ReadonlyArray<FileHistoryEntry>): ReadonlyArray<ClaimHistoryEntry> {
  const out: ClaimHistoryEntry[] = [];
  for (const e of entries) {
    try {
      const { data } = matter(e.content);
      const confidence = typeof data["confidence"] === "number" ? data["confidence"] : NaN;
      if (isNaN(confidence)) continue;
      out.push({
        sha: e.sha,
        isoDate: e.isoDate,
        confidence,
        evidenceCount: Array.isArray(data["evidence"]) ? (data["evidence"] as unknown[]).length : 0,
        opposingCount: Array.isArray(data["opposing"]) ? (data["opposing"] as unknown[]).length : 0,
        status: typeof data["status"] === "string" ? data["status"] : "active",
      });
    } catch {
      /* unparsable frontmatter — skip silently */
    }
  }
  return out;
}
