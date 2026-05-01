import { z } from "zod";

/** Discriminated channel union ensures `address` lives on email and `url` lives on mcp; no mixed-shape fallbacks at render time. */
const channel = z.discriminatedUnion("type", [
  z.object({ type: z.literal("email"), address: z.email() }),
  z.object({ type: z.literal("mcp"), url: z.url() }),
]);

/** Structured contact surface; a sender-side agent reasons against this before drafting. */
export const contactSchema = z.object({
  same_day_reply: z.array(z.string()).default([]),
  queued: z.array(z.string()).default([]),
  decline: z.array(z.string()).default([]),
  advisory_rate: z.object({
    currency: z.string(),
    hourly: z.string(),
    min_engagement: z.string(),
  }),
  fastest_no: z.string(),
  channels: z.array(channel),
  languages: z.array(z.string()),
});

/** Inferred shape of the structured public contact file. */
export type Contact = z.infer<typeof contactSchema>;
