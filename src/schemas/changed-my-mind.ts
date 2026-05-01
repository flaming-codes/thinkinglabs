import { z } from "zod";
import { isoDate, linkArray, tagsField } from "./_base.ts";

/** Belief-revision log; cross-links into claims so superseded views stay traversable. */
export const changedMyMindSchema = z.object({
  title: z.string().min(1),
  date: isoDate,
  used_to_believe: z.string().min(1),
  now_believe: z.string().min(1),
  what_changed: z.string().min(1),
  superseded_claims: linkArray.default([]),
  tags: tagsField,
});

/** Inferred frontmatter type for belief-revision entries. */
export type ChangedMyMind = z.infer<typeof changedMyMindSchema>;

/** Frontmatter array fields that map to typed edges in the index. */
export const changedMyMindLinkFields = {
  superseded_claims: "superseded_by",
} as const;
