import { z } from "zod";
import { isoDate, linkArray, tagsField } from "./_base.ts";

/** Long-form prose; only title + timestamps are required so voice over structure stays cheap. */
export const thoughtSchema = z.object({
  title: z.string().min(1),
  created: isoDate,
  updated: isoDate,
  tags: tagsField,
  claims: linkArray.default([]),
  inputs: linkArray.default([]),
});

/** Inferred frontmatter type for thought entries. */
export type Thought = z.infer<typeof thoughtSchema>;

/** Frontmatter array fields that map to typed edges in the index. */
export const thoughtLinkFields = {
  claims: "claims",
  inputs: "derived_from",
} as const;
