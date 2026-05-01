import { describe, expect, it } from "vitest";
import { parseClaimHistory } from "../src/lib/claim-history.ts";
import type { FileHistoryEntry } from "../src/lib/git.ts";

const v1: FileHistoryEntry = {
  sha: "aaa1",
  isoDate: "2026-01-01T00:00:00Z",
  content: `---\nclaim: Test.\nconfidence: 0.5\nstatus: active\n---\n`,
};

const v2: FileHistoryEntry = {
  sha: "bbb2",
  isoDate: "2026-02-01T00:00:00Z",
  content: `---\nclaim: Test.\nconfidence: 0.65\nevidence:\n  - note: New evidence\nstatus: active\n---\n`,
};

const v3: FileHistoryEntry = {
  sha: "ccc3",
  isoDate: "2026-03-01T00:00:00Z",
  content: `---\nclaim: Test.\nconfidence: 0.8\nevidence:\n  - note: A\n  - url: https://example.com\nopposing:\n  - Counter-argument.\nstatus: deprecated\n---\n`,
};

const malformed: FileHistoryEntry = {
  sha: "ddd4",
  isoDate: "2026-04-01T00:00:00Z",
  content: `not yaml at all: [[[`,
};

describe("parseClaimHistory", () => {
  it("returns typed snapshots for valid entries, oldest-first", () => {
    const result = parseClaimHistory([v1, v2, v3]);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ sha: "aaa1", confidence: 0.5, evidenceCount: 0, opposingCount: 0, status: "active" });
    expect(result[1]).toMatchObject({ sha: "bbb2", confidence: 0.65, evidenceCount: 1, opposingCount: 0, status: "active" });
    expect(result[2]).toMatchObject({ sha: "ccc3", confidence: 0.8, evidenceCount: 2, opposingCount: 1, status: "deprecated" });
  });

  it("skips entries whose frontmatter lacks a numeric confidence", () => {
    const noConf: FileHistoryEntry = {
      sha: "eee5",
      isoDate: "2026-05-01T00:00:00Z",
      content: `---\nclaim: Test.\nstatus: active\n---\n`,
    };
    const result = parseClaimHistory([v1, noConf, v3]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.sha)).toEqual(["aaa1", "ccc3"]);
  });

  it("skips entries with malformed frontmatter without throwing", () => {
    const result = parseClaimHistory([v1, malformed, v3]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.sha)).toEqual(["aaa1", "ccc3"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(parseClaimHistory([])).toEqual([]);
  });
});
