import { z } from "zod";
import { isoDate, linkArray, tagsField } from "./_base.ts";

/** Atomic citable claim; `confidence` is the load-bearing field — schema rejects anything outside [0,1]. */
export const claimSchema = z.object({
  claim: z.string().min(1),
  confidence: z.number().min(0).max(1),
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
});

/** Inferred frontmatter type for claim entries. */
export type Claim = z.infer<typeof claimSchema>;

/** Frontmatter array fields that map to typed edges in the index. */
export const claimLinkFields = {
  derived_from: "derived_from",
  supersedes: "supersedes",
  superseded_by: "superseded_by",
} as const;
