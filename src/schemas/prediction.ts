import { z } from "zod";
import { confidenceField, isoDate, linkArray, tagsField } from "./_base.ts";

/** Falsifiable prediction; resolution defaults to pending so calibration math is always well-defined, and strict keys turn a typo'd field into a build error. */
export const predictionSchema = z
  .object({
    prediction: z.string().min(1),
    made: isoDate,
    resolves: isoDate,
    confidence: confidenceField,
    resolution: z.enum(["pending", "true", "false", "ambiguous"]).default("pending"),
    resolved_on: isoDate.nullable().default(null),
    resolution_note: z.string().nullable().default(null),
    evidence_at_time: linkArray.default([]),
    tags: tagsField,
  })
  .strict()
  .refine((p) => Date.parse(p.made) <= Date.parse(p.resolves), {
    message: "made must be on or before resolves",
    path: ["resolves"],
  })
  .refine((p) => (p.resolution === "pending") === (p.resolved_on === null), {
    message: "resolved_on must be null when resolution is pending and set once it is resolved",
    path: ["resolved_on"],
  })
  .refine((p) => (p.resolution === "pending") === (p.resolution_note === null), {
    message: "resolution_note must be null when resolution is pending and set once it is resolved",
    path: ["resolution_note"],
  });

/** Inferred frontmatter type for prediction entries. */
export type Prediction = z.infer<typeof predictionSchema>;

/** Frontmatter array fields that map to typed edges in the index. */
export const predictionLinkFields = {
  evidence_at_time: "evidence_at_time",
} as const;
