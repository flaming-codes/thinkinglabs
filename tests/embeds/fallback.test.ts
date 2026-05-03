import { describe, expect, it } from "vite-plus/test";
import { findEmbeddedTool } from "../../embeds/index.ts";
import { predictionCalibrationLogger } from "../../embeds/prediction-calibration-logger/index.ts";
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

  it("the registry resolves the same payload object exported from the embed module", () => {
    const fromRegistry = findEmbeddedTool("prediction-calibration-logger");
    expect(fromRegistry, "registry must expose the embed by id").toBeDefined();
    expect(fromRegistry, "registry payload is referentially equal to the module export").toBe(
      predictionCalibrationLogger,
    );
    expect(fromRegistry?.contract.id).toBe("prediction-calibration-logger");
    expect(fromRegistry?.contract.fallback.rows.length).toBeGreaterThan(0);
  });
});
