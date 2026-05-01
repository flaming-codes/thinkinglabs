import { describe, expect, it } from "vite-plus/test";
import { findEmbeddedTool } from "../../embeds/index.ts";
import {
  loadCalibrationLogSnapshot,
  summarizeCalibrationLog,
} from "../../embeds/prediction-calibration-logger/index.ts";

describe("prediction calibration logger data", () => {
  it("loads static JSON with deterministic sample ids", () => {
    const snapshot = loadCalibrationLogSnapshot();
    expect(snapshot.asOf).toBe("2026-05-01");
    expect(snapshot.samples.map((sample) => sample.id)).toEqual([
      "m7-seed-01",
      "m7-seed-02",
      "m7-seed-03",
      "m7-seed-04",
      "m7-seed-05",
      "m7-seed-06",
      "m7-seed-07",
      "m7-seed-08",
    ]);
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
