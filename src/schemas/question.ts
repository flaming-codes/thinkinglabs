import { z } from "zod";
import { isoDate, linkArray, tagsField } from "./_base.ts";

/** Open question with enough context that a reader's agent can act on it. */
export const questionSchema = z.object({
  question: z.string().min(1),
  asked: isoDate,
  status: z.enum(["open", "partial", "closed"]).default("open"),
  context: z.string().optional(),
  attempts: z.array(z.string()).default([]),
  ideal_responder: z.string().optional(),
  related_claims: linkArray.default([]),
  related_projects: linkArray.default([]),
  tags: tagsField,
});

/** Inferred frontmatter type for question entries. */
export type Question = z.infer<typeof questionSchema>;

/** Frontmatter array fields that map to typed edges in the index. */
export const questionLinkFields = {
  related_claims: "related_claims",
  related_projects: "related_projects",
} as const;
