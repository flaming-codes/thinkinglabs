import { z } from "zod";
import { isoDate, linkArray, tagsField } from "./_base.ts";

/** Long-form evergreen writing; per-section freshness lives in the body markdown, not frontmatter. */
export const postSchema = z.object({
  title: z.string().min(1),
  created: isoDate,
  updated: isoDate,
  summary: z.string().optional(),
  related_claims: linkArray.default([]),
  related_thoughts: linkArray.default([]),
  tags: tagsField,
});

/** Inferred frontmatter type for post entries. */
export type Post = z.infer<typeof postSchema>;

/** Frontmatter array fields that map to typed edges in the index. */
export const postLinkFields = {
  related_claims: "related_claims",
  related_thoughts: "related_thoughts",
} as const;
