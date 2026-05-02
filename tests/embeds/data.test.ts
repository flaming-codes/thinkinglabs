import { describe, expect, it } from "vite-plus/test";
import { findEmbeddedTool } from "../../embeds/index.ts";
import {
  loadCalibrationLogSnapshot,
  summarizeCalibrationLog,
} from "../../embeds/prediction-calibration-logger/index.ts";

describe("prediction calibration logger data", () => {
  it("loads a non-empty static snapshot with unique well-formed sample ids and ordered confidences", () => {
    const snapshot = loadCalibrationLogSnapshot();
    expect(snapshot.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(snapshot.samples.length).toBeGreaterThan(0);

    const ids = snapshot.samples.map((sample) => sample.id);
    expect(new Set(ids).size, "every snapshot sample has a unique id").toBe(ids.length);
    for (const id of ids) {
      expect(id, "id matches m7-seed-NN naming").toMatch(/^m7-seed-\d{2}$/);
    }
    for (const sample of snapshot.samples) {
      expect(sample.confidence).toBeGreaterThanOrEqual(0);
      expect(sample.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("computes a stable summary from static data", () => {
    const summary = summarizeCalibrationLog(loadCalibrationLogSnapshot());
    expect(summary.sampleCount).toBe(8);
    expect(summary.averageConfidence).toBeCloseTo(0.7675, 5);
    expect(summary.hitRate).toBe(0.75);
    expect(summary.brierScore).toBeCloseTo(0.21995, 5);
  });

  it("publishes parsed data and summary in the registered payload", () => {
    const tool = findEmbeddedTool("prediction-calibration-logger");
    expect(tool?.data).toMatchObject({
      snapshot: { asOf: "2026-05-01" },
      summary: { sampleCount: 8 },
    });
  });
});
