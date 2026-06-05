import { z } from "zod";
import { isoDate, linkArray, tagsField } from "./_base.ts";

/** Project lifecycle states; declaration order matches the rendering order on `/projects`. */
export const PROJECT_STATUSES = ["alive", "dormant", "shipped", "abandoned"] as const;

/** One element of {@link PROJECT_STATUSES}; the schema's status field narrows to this type. */
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Projects carry a state machine; `last_touched` is auto-derived and must never be hand-edited, and strict keys turn a typo'd field into a build error. */
export const projectSchema = z
  .object({
    title: z.string().min(1),
    status: z.enum(PROJECT_STATUSES),
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
  })
  .strict();

/** Inferred frontmatter type for project entries. */
export type Project = z.infer<typeof projectSchema>;

/** Frontmatter array fields that map to typed edges in the index. */
export const projectLinkFields = {
  related_thoughts: "related_thoughts",
  related_claims: "related_claims",
} as const;
