import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  buildClaimsRevised,
  buildDecisionsReversed,
  buildPredictionsResolved,
  type JsonFeed,
  writeFeeds,
} from "../scripts/build-feeds.ts";

let root: string;

function writeFile(rel: string, contents: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, contents, "utf8");
}

function writeClaim(
  slug: string,
  fields: {
    confidence?: number;
    status?: string;
    supersedes?: string[];
    superseded_by?: string[];
    last_reviewed?: string;
  },
): void {
  const lines = [
    `claim: "Claim ${slug}."`,
    `confidence: ${fields.confidence ?? 0.5}`,
    `last_reviewed: "${fields.last_reviewed ?? "2026-01-01"}"`,
    `status: "${fields.status ?? "active"}"`,
    `supersedes: [${(fields.supersedes ?? []).map((s) => `"${s}"`).join(", ")}]`,
    `superseded_by: [${(fields.superseded_by ?? []).map((s) => `"${s}"`).join(", ")}]`,
    "tags: []",
  ];
  writeFile(`content/claims/${slug}.md`, `---\n${lines.join("\n")}\n---\n\nbody\n`);
}

function writeDecision(
  slug: string,
  fields: { status?: string; reverses?: string[]; date?: string },
): void {
  const lines = [
    `decision: "Decision ${slug}."`,
    `date: "${fields.date ?? "2026-01-01"}"`,
    `status: "${fields.status ?? "standing"}"`,
    'chosen: "x"',
    `reverses: [${(fields.reverses ?? []).map((s) => `"${s}"`).join(", ")}]`,
    "related_claims: []",
    "related_projects: []",
    "options_considered: []",
    "tags: []",
  ];
  writeFile(`content/decisions/${slug}.md`, `---\n${lines.join("\n")}\n---\n\nbody\n`);
}

function writePrediction(
  slug: string,
  fields: { resolution?: string; confidence?: number; resolved_on?: string | null; made?: string },
): void {
  const resolvedOn =
    fields.resolved_on === undefined
      ? "null"
      : fields.resolved_on === null
        ? "null"
        : `"${fields.resolved_on}"`;
  const lines = [
    `prediction: "Prediction ${slug}."`,
    `made: "${fields.made ?? "2026-01-01"}"`,
    'resolves: "2026-02-01"',
    `confidence: ${fields.confidence ?? 0.5}`,
    `resolution: "${fields.resolution ?? "pending"}"`,
    `resolved_on: ${resolvedOn}`,
    "resolution_note: null",
    "evidence_at_time: []",
    "tags: []",
  ];
  writeFile(`content/predictions/${slug}.md`, `---\n${lines.join("\n")}\n---\n\nbody\n`);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "build-feeds-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("buildClaimsRevised", () => {
  it("includes deprecated, superseded, and supersedes/superseded_by entries; excludes plain active claims; sorts by last_reviewed desc", () => {
    writeClaim("a-active", { last_reviewed: "2026-04-01" });
    writeClaim("b-deprecated", { status: "deprecated", last_reviewed: "2026-03-01" });
    writeClaim("c-superseded-link", { superseded_by: ["claims/x"], last_reviewed: "2026-05-01" });
    writeClaim("d-supersedes", { supersedes: ["claims/y"], last_reviewed: "2026-02-01" });

    const feed = buildClaimsRevised({ cwd: root });
    expect(feed.version).toBe("https://jsonfeed.org/version/1.1");
    expect(feed.title).toBe("Claims revised");
    expect(feed.feed_url).toBe("https://tom.wild.as/feed/claims-revised.json");
    expect(feed.home_page_url).toBe("https://tom.wild.as/claims");
    expect(feed.items).toHaveLength(3);
    expect(feed.items.map((i) => i.id)).toEqual([
      "https://tom.wild.as/claims/c-superseded-link",
      "https://tom.wild.as/claims/b-deprecated",
      "https://tom.wild.as/claims/d-supersedes",
    ]);
    expect(feed.items[0]?.url).toBe("https://tom.wild.as/claims/c-superseded-link");
    expect(feed.items[0]?.title).toBe("Claim c-superseded-link.");
    expect(feed.items[0]?.date_published).toBe("2026-05-01");
  });
});

describe("buildDecisionsReversed", () => {
  it("includes reversed/superseded statuses and decisions with `reverses` links; excludes standing decisions; sorts by date desc", () => {
    writeDecision("a-standing", { date: "2026-04-01" });
    writeDecision("b-reverses", { reverses: ["decisions/old"], date: "2026-05-01" });
    writeDecision("c-reversed", { status: "reversed", date: "2026-03-01" });
    writeDecision("d-superseded", { status: "superseded", date: "2026-02-01" });

    const feed = buildDecisionsReversed({ cwd: root });
    expect(feed.title).toBe("Decisions reversed");
    expect(feed.items.map((i) => i.id)).toEqual([
      "https://tom.wild.as/decisions/b-reverses",
      "https://tom.wild.as/decisions/c-reversed",
      "https://tom.wild.as/decisions/d-superseded",
    ]);
    expect(feed.items[0]?.title).toBe("Decision b-reverses.");
    expect(feed.items[0]?.content_text).toContain("reverses=decisions/old");
    expect(feed.items[1]?.content_text).toContain("status=reversed");
  });
});

describe("buildPredictionsResolved", () => {
  it("includes only resolution != pending; sorts by resolved_on desc", () => {
    writePrediction("a-pending", { resolution: "pending" });
    writePrediction("b-true", { resolution: "true", resolved_on: "2026-03-01" });
    writePrediction("c-false", { resolution: "false", resolved_on: "2026-05-01" });
    writePrediction("d-ambiguous", { resolution: "ambiguous", resolved_on: "2026-04-01" });

    const feed = buildPredictionsResolved({ cwd: root });
    expect(feed.title).toBe("Predictions resolved");
    expect(feed.items).toHaveLength(3);
    expect(feed.items.map((i) => i.id)).toEqual([
      "https://tom.wild.as/predictions/c-false",
      "https://tom.wild.as/predictions/d-ambiguous",
      "https://tom.wild.as/predictions/b-true",
    ]);
    expect(feed.items[0]?.content_text).toContain("resolution=false");
    expect(feed.items[0]?.date_published).toBe("2026-05-01");
  });
});

describe("writeFeeds", () => {
  it("writes all three deterministic feeds to disk under <cwd>/public/feed", () => {
    writeClaim("a-deprecated", { status: "deprecated", last_reviewed: "2026-04-01" });
    writeDecision("b-reverses", { reverses: ["decisions/old"], date: "2026-04-01" });
    writePrediction("c-true", { resolution: "true", resolved_on: "2026-04-01" });

    const written = writeFeeds({ cwd: root });
    expect(written).toHaveLength(3);

    const claims = JSON.parse(
      readFileSync(join(root, "public/feed/claims-revised.json"), "utf8"),
    ) as JsonFeed;
    const decisions = JSON.parse(
      readFileSync(join(root, "public/feed/decisions-reversed.json"), "utf8"),
    ) as JsonFeed;
    const predictions = JSON.parse(
      readFileSync(join(root, "public/feed/predictions-resolved.json"), "utf8"),
    ) as JsonFeed;

    expect(claims.items).toHaveLength(1);
    expect(decisions.items).toHaveLength(1);
    expect(predictions.items).toHaveLength(1);
    expect(claims.items[0]?.id).toBe("https://tom.wild.as/claims/a-deprecated");
    expect(decisions.items[0]?.id).toBe("https://tom.wild.as/decisions/b-reverses");
    expect(predictions.items[0]?.id).toBe("https://tom.wild.as/predictions/c-true");
  });

  it("writes empty `items` arrays when no content matches", () => {
    writeClaim("a-active", {});
    writeDecision("b-standing", {});
    writePrediction("c-pending", {});

    const written = writeFeeds({ cwd: root });
    expect(written).toHaveLength(3);
    for (const path of written) {
      const feed = JSON.parse(readFileSync(path, "utf8")) as JsonFeed;
      expect(feed.items).toEqual([]);
      expect(feed.version).toBe("https://jsonfeed.org/version/1.1");
    }
  });

  it("respects --site override via siteUrl option", () => {
    writeClaim("a-deprecated", { status: "deprecated" });
    const feed = buildClaimsRevised({ cwd: root, siteUrl: "https://staging.example.com" });
    expect(feed.feed_url).toBe("https://staging.example.com/feed/claims-revised.json");
    expect(feed.items[0]?.url).toBe("https://staging.example.com/claims/a-deprecated");
  });
});
