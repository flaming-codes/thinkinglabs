import { z } from "zod";
import { isoDate, linkArray, tagsField } from "./_base.ts";

/** Short first-party notes about the world; lighter than a thought, less committed than a claim, with strict keys turning a typo'd field into a build error. */
export const observationSchema = z
  .object({
    observation: z.string().min(1),
    observed: isoDate,
    source: z.string().optional(),
    url: z.url().optional(),
    context: z.string().optional(),
    related_claims: linkArray.default([]),
    related_thoughts: linkArray.default([]),
    related_projects: linkArray.default([]),
    tags: tagsField,
  })
  .strict();

/** Inferred frontmatter type for observation entries. */
export type Observation = z.infer<typeof observationSchema>;

/** Frontmatter array fields that map to typed edges in the index. */
export const observationLinkFields = {
  related_claims: "related_claims",
  related_thoughts: "related_thoughts",
  related_projects: "related_projects",
} as const;
