import { z } from "zod";

/** Reader-submitted answer to an open question; minimal fields the agent triages. */
export const submissionSchema = z.object({
  questionSlug: z.string().min(1),
  receivedAt: z.string(),
  responder: z.object({
    name: z.string().min(1),
    affiliation: z.string().optional(),
    contact: z.string().optional(),
    credentials: z.string().optional(),
  }),
  body: z.string().min(1),
  pointers: z.array(z.string()).default([]),
});

/** Inferred type for submissionSchema. */
export type Submission = z.infer<typeof submissionSchema>;
