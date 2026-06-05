import { z } from "zod";
import { confidenceField, isoDate, linkArray, tagsField } from "./_base.ts";

/** Atomic citable claim; `confidence` is the load-bearing field rejecting anything outside [0,1], and strict keys turn a typo'd field into a build error. */
export const claimSchema = z
  .object({
    claim: z.string().min(1),
    confidence: confidenceField,
    evidence: z
      .array(
        z.object({
          url: z.url().optional(),
          note: z.string().optional(),
        }),
      )
      .default([]),
    opposing: z.array(z.string()).default([]),
    derived_from: linkArray.default([]),
    last_reviewed: isoDate,
    status: z.enum(["active", "deprecated", "superseded"]).default("active"),
    supersedes: linkArray.default([]),
    superseded_by: linkArray.default([]),
    tags: tagsField,
  })
  .strict()
  .refine((c) => c.status !== "superseded" || c.superseded_by.length > 0, {
    message: "a superseded claim must list at least one superseded_by reference",
    path: ["superseded_by"],
  });

/** Inferred frontmatter type for claim entries. */
export type Claim = z.infer<typeof claimSchema>;

/** Frontmatter array fields that map to typed edges in the index. */
export const claimLinkFields = {
  derived_from: "derived_from",
  supersedes: "supersedes",
  superseded_by: "superseded_by",
} as const;
