import { z } from "zod";
import { isoDate, tagsField } from "./_base.ts";

/** External material that shaped thinking; minimal — title, source, when, optional note. */
export const inputSchema = z.object({
  title: z.string().min(1),
  url: z.url().optional(),
  source: z.string().optional(),
  consumed: isoDate,
  note: z.string().optional(),
  tags: tagsField,
});

/** Inferred frontmatter type for input entries. */
export type Input = z.infer<typeof inputSchema>;

/** Frontmatter array fields that map to typed edges in the index. */
export const inputLinkFields = {} as const;
