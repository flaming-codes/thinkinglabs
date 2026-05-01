import { readFileSync } from "node:fs";
import { z } from "zod";
import { defineEmbeddedTool, type EmbeddedFallbackRow } from "../core.ts";

const SampleSchema = z.object({
  id: z.string().min(1),
  confidence: z.number().min(0).max(1),
  resolved: z.boolean(),
});

const SnapshotSchema = z.object({
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scenario: z.string().min(1),
  samples: z.array(SampleSchema).min(1),
});

/** Static prediction calibration sample loaded from the embed-owned JSON file. */
export type CalibrationLogSnapshot = z.infer<typeof SnapshotSchema>;

/** Small aggregate shown in fallback markup and endpoint consumers. */
export interface CalibrationLogSummary {
  readonly sampleCount: number;
  readonly averageConfidence: number;
  readonly hitRate: number;
  readonly brierScore: number;
}

/** Loads and validates the static calibration snapshot. */
export function loadCalibrationLogSnapshot(): CalibrationLogSnapshot {
  const raw: unknown = JSON.parse(readFileSync(new URL("./data.json", import.meta.url), "utf8"));
  return SnapshotSchema.parse(raw);
}

/** Computes deterministic calibration summary values from static samples. */
export function summarizeCalibrationLog(snapshot: CalibrationLogSnapshot): CalibrationLogSummary {
  const sampleCount = snapshot.samples.length;
  const averageConfidence = snapshot.samples.reduce((sum, sample) => sum + sample.confidence, 0) / sampleCount;
  const hitRate = snapshot.samples.filter((sample) => sample.resolved).length / sampleCount;
  const brierScore = snapshot.samples.reduce((sum, sample) => {
    const outcome = sample.resolved ? 1 : 0;
    return sum + (sample.confidence - outcome) ** 2;
  }, 0) / sampleCount;
  return { sampleCount, averageConfidence, hitRate, brierScore };
}

/** Formats a ratio as a whole percent for compact fallback rows. */
export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Builds the no-JS fallback rows for the local calibration logger. */
export function calibrationFallbackRows(snapshot: CalibrationLogSnapshot): readonly EmbeddedFallbackRow[] {
  const summary = summarizeCalibrationLog(snapshot);
  return [
    { label: "Static sample", value: `${summary.sampleCount} logged predictions` },
    { label: "Average confidence", value: percent(summary.averageConfidence) },
    { label: "Resolved true", value: percent(summary.hitRate) },
    { label: "Brier score", value: summary.brierScore.toFixed(3) },
  ];
}

const snapshot = loadCalibrationLogSnapshot();

/** Static scoped embed for local prediction calibration logging. */
export const predictionCalibrationLogger = defineEmbeddedTool({
  contract: {
    id: "prediction-calibration-logger",
    title: "Prediction calibration logger",
    kind: "local-prediction-calibration-logger",
    version: 1,
    summary: "Log a local confidence estimate against a static calibration sample without sending data anywhere.",
    scope: {
      endpoint: "/api/embed/prediction-calibration-logger.json",
      storageKey: "me.embed.prediction-calibration-logger.v1",
      capabilities: ["static-json", "local-calibration-log"],
      writeScope: "browser-local-only",
    },
    fallback: {
      status: `Static snapshot as of ${snapshot.asOf}; local entries require JavaScript and stay in this browser.`,
      rows: calibrationFallbackRows(snapshot),
    },
  },
  data: {
    snapshot,
    summary: summarizeCalibrationLog(snapshot),
  },
});
