import type { z } from "zod";
import type { Kind } from "./kinds.ts";
import { KINDS } from "./kinds.ts";
import { changedMyMindLinkFields, changedMyMindSchema } from "./changed-my-mind.ts";
import { claimLinkFields, claimSchema } from "./claim.ts";
import { decisionLinkFields, decisionSchema } from "./decision.ts";
import { inputLinkFields, inputSchema } from "./input.ts";
import { observationLinkFields, observationSchema } from "./observation.ts";
import { postLinkFields, postSchema } from "./post.ts";
import { predictionLinkFields, predictionSchema } from "./prediction.ts";
import { projectLinkFields, projectSchema } from "./project.ts";
import { provenanceLinkFields, provenanceEventSchema } from "./provenance.ts";
import { questionLinkFields, questionSchema } from "./question.ts";
import { thoughtLinkFields, thoughtSchema } from "./thought.ts";

export { KINDS } from "./kinds.ts";
export type { Kind } from "./kinds.ts";

/** Edge-type metadata: maps a frontmatter field name to the typed edge label written into `links`. */
export type LinkFieldMap = Readonly<Record<string, string>>;

/** Per-kind bundle keeps schema and edge-type metadata adjacent so the index builder is fully kind-parameterized. */
export interface KindSpec<S extends z.ZodTypeAny = z.ZodTypeAny> {
  readonly schema: S;
  readonly linkFields: LinkFieldMap;
}

/** Single registry the content config, index builder, and future MCP server all read from — no per-kind branching elsewhere. */
export const KIND_SCHEMAS = {
  thoughts: { schema: thoughtSchema, linkFields: thoughtLinkFields },
  claims: { schema: claimSchema, linkFields: claimLinkFields },
  projects: { schema: projectSchema, linkFields: projectLinkFields },
  predictions: { schema: predictionSchema, linkFields: predictionLinkFields },
  "changed-my-mind": { schema: changedMyMindSchema, linkFields: changedMyMindLinkFields },
  decisions: { schema: decisionSchema, linkFields: decisionLinkFields },
  questions: { schema: questionSchema, linkFields: questionLinkFields },
  posts: { schema: postSchema, linkFields: postLinkFields },
  inputs: { schema: inputSchema, linkFields: inputLinkFields },
  observations: { schema: observationSchema, linkFields: observationLinkFields },
  provenance: { schema: provenanceEventSchema, linkFields: provenanceLinkFields },
} as const satisfies Record<Kind, KindSpec>;

/** Compile-time assertion that the registry covers every kind exactly. */
const _coverage: ReadonlyArray<Kind> = KINDS;
void _coverage;
