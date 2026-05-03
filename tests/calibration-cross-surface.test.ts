import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { calibration } from "../src/lib/calibration.ts";
import {
  calibrationToMcpEnvelope,
  predictionCalibration,
} from "../servers/thinkinglabs-mcp/store.ts";
import type { Prediction } from "../src/schemas/prediction.ts";

let root: string;

interface Fixture {
  readonly slug: string;
  readonly confidence: number;
  readonly resolution: "true" | "false" | "ambiguous" | "pending";
}

/** Ten-prediction deterministic fixture spanning bucket boundaries and resolution variants. */
const FIXTURES: ReadonlyArray<Fixture> = [
  { slug: "p01", confidence: 0.05, resolution: "false" },
  { slug: "p02", confidence: 0.15, resolution: "true" },
  { slug: "p03", confidence: 0.25, resolution: "false" },
  { slug: "p04", confidence: 0.35, resolution: "false" },
  { slug: "p05", confidence: 0.55, resolution: "true" },
  { slug: "p06", confidence: 0.65, resolution: "false" },
  { slug: "p07", confidence: 0.75, resolution: "true" },
  { slug: "p08", confidence: 0.85, resolution: "true" },
  { slug: "p09", confidence: 0.95, resolution: "true" },
  // pending and ambiguous must not affect calibration
  { slug: "p10", confidence: 0.5, resolution: "pending" },
  { slug: "p11", confidence: 0.4, resolution: "ambiguous" },
];

function writePrediction(f: Fixture): void {
  const dir = join(root, "content", "predictions");
  mkdirSync(dir, { recursive: true });
  const resolvedOn = f.resolution === "pending" ? "null" : '"2026-02-02"';
  const fm = [
    `prediction: "Prediction ${f.slug}."`,
    'made: "2026-01-01"',
    'resolves: "2026-02-01"',
    `confidence: ${f.confidence}`,
    `resolution: "${f.resolution}"`,
    `resolved_on: ${resolvedOn}`,
    "resolution_note: null",
    "evidence_at_time: []",
    "tags: []",
  ].join("\n");
  writeFileSync(join(dir, `${f.slug}.md`), `---\n${fm}\n---\n\nbody\n`, "utf8");
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "calibration-cross-"));
  for (const f of FIXTURES) writePrediction(f);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("calibration cross-surface parity", () => {
  it("MCP envelope from shared calibration() matches direct envelope adapter", () => {
    const resolved = FIXTURES.filter((f) => f.resolution !== "pending").map(
      (f): Pick<Prediction, "confidence" | "resolution"> => ({
        confidence: f.confidence,
        resolution: f.resolution,
      }),
    );
    const webBuckets = calibration(resolved);
    const mcpEnvelope = calibrationToMcpEnvelope(resolved);

    // Envelope `resolved` count is total inputs (including ambiguous, which the helper drops).
    expect(mcpEnvelope.resolved).toBe(resolved.length);
    // Per-bucket totals/correct/accuracy must match the shared helper exactly.
    expect(mcpEnvelope.buckets).toHaveLength(webBuckets.length);
    for (let i = 0; i < webBuckets.length; i++) {
      const web = webBuckets[i]!;
      const mcp = mcpEnvelope.buckets[i]!;
      expect(mcp.total).toBe(web.total);
      expect(mcp.correct).toBe(web.correct);
      expect(mcp.accuracy).toBe(web.accuracy);
      expect(mcp.confidence).toBe(Math.round(web.mid * 10) / 10);
    }
  });

  it("predictionCalibration over real fixture files yields identical buckets to calibration()", () => {
    const resolved = FIXTURES.filter(
      (f) => f.resolution === "true" || f.resolution === "false" || f.resolution === "ambiguous",
    ).map(
      (f): Pick<Prediction, "confidence" | "resolution"> => ({
        confidence: f.confidence,
        resolution: f.resolution as "true" | "false" | "ambiguous",
      }),
    );
    const webBuckets = calibration(resolved);
    const mcp = predictionCalibration(root);

    expect(mcp.resolved).toBe(resolved.length);
    expect(mcp.buckets).toHaveLength(webBuckets.length);
    for (let i = 0; i < webBuckets.length; i++) {
      const web = webBuckets[i]!;
      const m = mcp.buckets[i]!;
      expect(m.total).toBe(web.total);
      expect(m.correct).toBe(web.correct);
      expect(m.accuracy).toBe(web.accuracy);
    }
  });

  it("ignores pending predictions in the MCP-side computation", () => {
    const mcp = predictionCalibration(root);
    // Only true/false/ambiguous count toward `resolved`; pending must be excluded.
    const expectedResolved = FIXTURES.filter((f) => f.resolution !== "pending").length;
    expect(mcp.resolved).toBe(expectedResolved);
  });
});
