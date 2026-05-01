import type { EmbeddedToolPayload } from "./core.ts";
import { predictionCalibrationLogger } from "./prediction-calibration-logger/index.ts";

/** Registry of every embedded scoped agent exposed by the site. */
export const embeddedTools = [
  predictionCalibrationLogger,
] as const satisfies readonly EmbeddedToolPayload[];

/** Stable ids for static path generation and contract tests. */
export const embeddedToolIds = embeddedTools.map((tool) => tool.contract.id);

/** Finds an embedded scoped agent payload by public id. */
export function findEmbeddedTool(id: string): EmbeddedToolPayload | undefined {
  return embeddedTools.find((tool) => tool.contract.id === id);
}
