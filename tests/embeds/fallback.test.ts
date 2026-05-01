import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { findEmbeddedTool } from "../../embeds/index.ts";
import {
  calibrationFallbackRows,
  loadCalibrationLogSnapshot,
} from "../../embeds/prediction-calibration-logger/index.ts";

describe("embedded scoped agent fallback", () => {
  it("ships complete fallback rows without client state", () => {
    const rows = calibrationFallbackRows(loadCalibrationLogSnapshot());
    expect(rows.map((row) => row.label)).toEqual([
      "Static sample",
      "Average confidence",
      "Resolved true",
      "Brier score",
    ]);
    expect(rows.every((row) => row.value.length > 0)).toBe(true);
  });

  it("exposes the same fallback through the public contract", () => {
    const tool = findEmbeddedTool("prediction-calibration-logger");
    expect(tool?.contract.fallback.status).toContain("Static snapshot as of 2026-05-01");
    expect(tool?.contract.fallback.rows).toEqual(
      calibrationFallbackRows(loadCalibrationLogSnapshot()),
    );
  });

  it("is mounted on the calibration page", () => {
    const page = readFileSync(
      resolve(import.meta.dirname, "../../src/pages/predictions/calibration.astro"),
      "utf8",
    );
    expect(page).toContain("EmbeddedTool");
    expect(page).toContain("predictionCalibrationLogger");
  });
});
