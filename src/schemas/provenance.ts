import { z } from "zod";
import { isoDate, tagsField } from "./_base.ts";

/** Stable object reference into the semantic layer, e.g. `claims/foo` or `thoughts/bar`. */
export const objectRefSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+\/[a-z0-9][a-z0-9/_-]*$/),
});

/** Provider ids supported by the LLM runtime. */
export const modelProviderSchema = z.enum(["openai", "ollama"]);

/** Provider-agnostic capability tier; mapped to a concrete model id at call time. */
export const modelTierSchema = z.enum(["fast", "balanced", "deep"]);

/** Concrete model identity captured at the time an LLM call is made. */
export const modelRefSchema = z.object({
  provider: modelProviderSchema,
  model: z.string().min(1),
  tier: modelTierSchema,
});

/** Actor that produced the provenance event. */
export const provenanceActorSchema = z.object({
  kind: z.literal("llm"),
  model: modelRefSchema,
});

/** Accepted provenance event categories. */
export const provenanceEventTypeSchema = z.enum([
  "content_derivation",
  "content_resolution",
  "change_scoring",
  "content_triage",
]);

/** Reusable provenance record for accepted AI-assisted effects; strict keys turn a typo'd field into a build error. */
export const provenanceEventSchema = z
  .object({
    title: z.string().min(1),
    event_type: provenanceEventTypeSchema,
    process_id: z.string().min(1),
    actor: provenanceActorSchema,
    started_at: isoDate,
    accepted_at: isoDate,
    source_objects: z.array(objectRefSchema).default([]),
    target_objects: z.array(objectRefSchema).default([]),
    outcome: z.enum(["accepted", "edited", "merged"]),
    tags: tagsField,
  })
  .strict();

/** Inferred frontmatter type for provenance entries. */
export type ProvenanceEvent = z.infer<typeof provenanceEventSchema>;

/** Inferred concrete model identity. */
export type ModelRef = z.infer<typeof modelRefSchema>;

/** Inferred provenance event kind. */
export type ProvenanceEventType = ProvenanceEvent["event_type"];

/** Frontmatter array fields that map to typed edges in the index. */
export const provenanceLinkFields = {} as const;
