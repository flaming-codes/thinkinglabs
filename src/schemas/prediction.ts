import { z } from "zod";
import { isoDate, linkArray, tagsField } from "./_base.ts";

/** Falsifiable prediction; resolution defaults to pending so calibration math is always well-defined. */
export const predictionSchema = z.object({
  prediction: z.string().min(1),
  made: isoDate,
  resolves: isoDate,
  confidence: z.number().min(0).max(1),
  resolution: z.enum(["pending", "true", "false", "ambiguous"]).default("pending"),
  resolved_on: isoDate.nullable().default(null),
  resolution_note: z.string().nullable().default(null),
  evidence_at_time: linkArray.default([]),
  tags: tagsField,
});

/** Inferred frontmatter type for prediction entries. */
export type Prediction = z.infer<typeof predictionSchema>;

/** Frontmatter array fields that map to typed edges in the index. */
export const predictionLinkFields = {
  evidence_at_time: "evidence_at_time",
} as const;
