import { z } from "zod";
import { isoDate, linkArray, tagsField } from "./_base.ts";

/** Projects carry a state machine; `last_touched` is auto-derived and must never be hand-edited. */
export const projectSchema = z.object({
  title: z.string().min(1),
  status: z.enum(["alive", "dormant", "shipped", "abandoned"]),
  started: isoDate,
  last_touched: isoDate.optional(),
  current_question: z.string().optional(),
  help_welcome: z.string().optional(),
  links: z
    .object({
      repo: z.url().optional(),
      productive_id: z.string().optional(),
    })
    .partial()
    .default({}),
  related_thoughts: linkArray.default([]),
  related_claims: linkArray.default([]),
  tags: tagsField,
});

/** Inferred frontmatter type for project entries. */
export type Project = z.infer<typeof projectSchema>;

/** Frontmatter array fields that map to typed edges in the index. */
export const projectLinkFields = {
  related_thoughts: "related_thoughts",
  related_claims: "related_claims",
} as const;
