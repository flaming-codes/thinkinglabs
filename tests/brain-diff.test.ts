import { describe, expect, it } from "vite-plus/test";
import {
  applyGenericGate,
  brainDiffSpecializedFeedFilename,
  buildEntries,
  classify,
  FEED_PREDICATES,
  formatAtom,
  formatJson,
  isTrackedPath,
  type CommitDiff,
  type FeedEntry,
  type FileDiff,
} from "../src/lib/brain-diff.ts";

function fd(p: Partial<FileDiff> & { path: string; status: "A" | "M" | "D" }): FileDiff {
  return { ...p } as FileDiff;
}

describe("classify", () => {
  it("new claim", () => {
    expect(
      classify(
        fd({
          path: "content/claims/foo.md",
          status: "A",
          newFrontmatter: { claim: "x", confidence: 0.5 },
        }),
      ),
    ).toBe("new-claim");
  });

  it("claim revised", () => {
    expect(
      classify(
        fd({
          path: "content/claims/foo.md",
          status: "M",
          oldFrontmatter: { confidence: 0.5 },
          newFrontmatter: { confidence: 0.7 },
        }),
      ),
    ).toBe("claim-revised");
  });

  it("claim deprecated", () => {
    expect(
      classify(
        fd({
          path: "content/claims/foo.md",
          status: "M",
          oldFrontmatter: { status: "active" },
          newFrontmatter: { status: "deprecated" },
        }),
      ),
    ).toBe("claim-deprecated");
  });

  it("decision reversed via status flip", () => {
    expect(
      classify(
        fd({
          path: "content/decisions/foo.md",
          status: "M",
          oldFrontmatter: { status: "standing" },
          newFrontmatter: { status: "reversed" },
        }),
      ),
    ).toBe("decision-reversed");
  });

  it("decision reversed via new file with reverses", () => {
    expect(
      classify(
        fd({
          path: "content/decisions/bar.md",
          status: "A",
          newFrontmatter: { reverses: ["decisions/foo"] },
        }),
      ),
    ).toBe("decision-reversed");
  });

  it("prediction resolved", () => {
    expect(
      classify(
        fd({
          path: "content/predictions/x.md",
          status: "M",
          oldFrontmatter: { resolution: "pending" },
          newFrontmatter: { resolution: "true" },
        }),
      ),
    ).toBe("prediction-resolved");
  });

  it("thought substantively updated", () => {
    expect(classify(fd({ path: "content/thoughts/x.md", status: "M" }))).toBe(
      "thought-substantively-updated",
    );
  });

  it("project status changed", () => {
    expect(
      classify(
        fd({
          path: "content/projects/x.md",
          status: "M",
          oldFrontmatter: { status: "alive" },
          newFrontmatter: { status: "dormant" },
        }),
      ),
    ).toBe("project-status-changed");
  });

  it("post section reverified", () => {
    expect(classify(fd({ path: "content/posts/x.md", status: "M" }))).toBe(
      "post-section-reverified",
    );
  });

  it("untracked falls through to other", () => {
    expect(classify(fd({ path: "content/inputs/x.md", status: "M" }))).toBe("other");
    expect(classify(fd({ path: "content/observations/x.md", status: "M" }))).toBe("other");
  });

  it("project edits without status change are 'other'", () => {
    expect(
      classify(
        fd({
          path: "content/projects/x.md",
          status: "M",
          oldFrontmatter: { status: "alive" },
          newFrontmatter: { status: "alive" },
        }),
      ),
    ).toBe("other");
  });
});

describe("isTrackedPath", () => {
  it("matches both bare and content/-prefixed paths", () => {
    expect(isTrackedPath("content/claims/foo.md")).toBe(true);
    expect(isTrackedPath("claims/foo.md")).toBe(true);
    expect(isTrackedPath("content/claims/.gitkeep")).toBe(false);
    expect(isTrackedPath("content/inputs/x.md")).toBe(false);
    expect(isTrackedPath("content/observations/x.md")).toBe(true);
    expect(isTrackedPath("README.md")).toBe(false);
  });
});

describe("formatters", () => {
  it("formatAtom on empty input still has feed envelope", () => {
    const xml = formatAtom([]);
    expect(xml).toContain("<feed");
    expect(xml).toContain("</feed>");
    expect(xml).not.toContain("<entry>");
  });

  it("formatJson on empty input has zero entries", () => {
    const json = JSON.parse(formatJson([])) as { entries: unknown[] };
    expect(json.entries).toEqual([]);
  });

  it("formatJson includes kind and entries", () => {
    const e: FeedEntry = {
      sha: "abc",
      isoDate: "2026-04-30T00:00:00Z",
      path: "claims/x.md",
      type: "new-claim",
      title: "claims/x",
      score: null,
      summary: null,
    };
    const obj = JSON.parse(formatJson([e], "claims-revised")) as {
      kind: string;
      entries: FeedEntry[];
    };
    expect(obj.kind).toBe("claims-revised");
    expect(obj.entries[0]?.title).toBe("claims/x");
  });

  it("uses BUILD_NOW_ISO for empty feed metadata", () => {
    const previous = process.env["BUILD_NOW_ISO"];
    process.env["BUILD_NOW_ISO"] = "2026-05-01T00:00:00.000Z";
    try {
      expect(JSON.parse(formatJson([])).generated).toBe("2026-05-01T00:00:00.000Z");
      expect(formatAtom([])).toContain("<updated>2026-05-01T00:00:00.000Z</updated>");
    } finally {
      if (previous === undefined) delete process.env["BUILD_NOW_ISO"];
      else process.env["BUILD_NOW_ISO"] = previous;
    }
  });
});

describe("specialized predicates and gate", () => {
  const commits: ReadonlyArray<CommitDiff> = [
    {
      sha: "deadbeef",
      isoDate: "2026-04-30T00:00:00Z",
      subject: "mixed batch",
      files: [
        fd({ path: "content/claims/a.md", status: "A", newFrontmatter: { claim: "x" } }),
        fd({
          path: "content/predictions/p.md",
          status: "M",
          oldFrontmatter: { resolution: "pending" },
          newFrontmatter: { resolution: "true" },
        }),
        fd({
          path: "content/decisions/d.md",
          status: "A",
          newFrontmatter: { reverses: ["decisions/old"] },
        }),
        fd({ path: "content/thoughts/t.md", status: "M" }),
      ],
    },
  ];

  const scored = new Map<string, { score: number; summary: string }>([
    ["deadbeef:content/claims/a.md", { score: 8, summary: "new" }],
    ["deadbeef:content/predictions/p.md", { score: 7, summary: "resolved" }],
    ["deadbeef:content/decisions/d.md", { score: 9, summary: "reversed" }],
    ["deadbeef:content/thoughts/t.md", { score: 1, summary: "typo" }],
  ]);

  const entries = buildEntries(commits, scored);

  it("predictions-resolved predicate filters correctly", () => {
    expect(entries.filter(FEED_PREDICATES["predictions-resolved"])).toHaveLength(1);
  });

  it("claims-revised predicate covers new + revised + deprecated", () => {
    expect(entries.filter(FEED_PREDICATES["claims-revised"])).toHaveLength(1);
  });

  it("decisions-reversed predicate filters correctly", () => {
    expect(entries.filter(FEED_PREDICATES["decisions-reversed"])).toHaveLength(1);
  });

  it("brain-diff specialized filenames do not collide with deterministic JSON Feed filenames", () => {
    expect(brainDiffSpecializedFeedFilename("claims-revised")).toBe(
      "brain-diff-claims-revised.json",
    );
    for (const kind of Object.keys(FEED_PREDICATES) as Array<keyof typeof FEED_PREDICATES>) {
      expect(brainDiffSpecializedFeedFilename(kind)).not.toBe(`${kind}.json`);
    }
  });

  it("generic gate excludes score < 4 but keeps high-score items", () => {
    const gated = applyGenericGate(entries);
    expect(gated.find((e) => e.path.endsWith("thoughts/t.md"))).toBeUndefined();
    expect(gated).toHaveLength(3);
  });

  it("generic gate is a no-op when scores are null (no-LLM mode)", () => {
    const noScores = buildEntries(commits);
    expect(applyGenericGate(noScores)).toHaveLength(noScores.length);
  });
});
