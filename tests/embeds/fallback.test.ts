import { describe, expect, it } from "vitest";
import { findEmbeddedTool } from "../../embeds/index.ts";
import { calibrationFallbackRows, loadCalibrationLogSnapshot } from "../../embeds/prediction-calibration-logger/index.ts";

describe("embedded scoped agent fallback", () => {
  it("ships complete fallback rows without client state", () => {
    const rows = calibrationFallbackRows(loadCalibrationLogSnapshot());
    expect(rows.map((row) => row.label)).toEqual(["Static sample", "Average confidence", "Resolved true", "Brier score"]);
    expect(rows.every((row) => row.value.length > 0)).toBe(true);
  });

  it("exposes the same fallback through the public contract", () => {
    const tool = findEmbeddedTool("prediction-calibration-logger");
    expect(tool?.contract.fallback.status).toContain("Static snapshot as of 2026-05-01");
    expect(tool?.contract.fallback.rows).toEqual(calibrationFallbackRows(loadCalibrationLogSnapshot()));
  });
});
