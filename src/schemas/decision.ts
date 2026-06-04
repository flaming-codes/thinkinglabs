import { z } from "zod";
import { isoDate, linkArray, tagsField } from "./_base.ts";

/** ADR-style public decision; reversals are themselves decisions linked via `reverses`, and strict keys turn a typo'd field into a build error. */
export const decisionSchema = z
  .object({
    decision: z.string().min(1),
    date: isoDate,
    status: z.enum(["standing", "reversed", "superseded"]).default("standing"),
    context: z.string().optional(),
    options_considered: z.array(z.string()).default([]),
    chosen: z.string().min(1),
    why: z.string().optional(),
    what_would_change_my_mind: z.string().optional(),
    follow_up_on: isoDate.optional(),
    reverses: linkArray.default([]),
    related_claims: linkArray.default([]),
    related_projects: linkArray.default([]),
    tags: tagsField,
  })
  .strict();

/** Inferred frontmatter type for decision entries. */
export type Decision = z.infer<typeof decisionSchema>;

/** Frontmatter array fields that map to typed edges in the index. */
export const decisionLinkFields = {
  reverses: "reverses",
  related_claims: "related_claims",
  related_projects: "related_projects",
} as const;
