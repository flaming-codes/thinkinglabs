import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  provenanceEventSchema,
  type ModelRef,
  type ProvenanceEvent,
  type ProvenanceEventType,
} from "../schemas/provenance.ts";
import type { ProposalSource } from "./proposal-queue.ts";

/** Current LLM-backed processes that can persist accepted provenance. */
export type ProvenanceProcessId = ProposalSource | "derive-claims";

/** Payload attached to queued proposals before a human accepts/edits them. */
export interface QueuedProvenance {
  readonly process_id: ProvenanceProcessId;
  readonly event_type: ProvenanceEventType;
  readonly actor: { readonly kind: "llm"; readonly model: ModelRef };
  readonly started_at: string;
  readonly source_objects: ReadonlyArray<{ readonly id: string }>;
  readonly target_objects: ReadonlyArray<{ readonly id: string }>;
  readonly tags?: ReadonlyArray<string> | undefined;
}

/** Arguments for writing one accepted provenance event. */
export interface WriteProvenanceEventArgs extends QueuedProvenance {
  readonly cwd: string;
  readonly title: string;
  readonly accepted_at: string;
  readonly outcome: ProvenanceEvent["outcome"];
}

/** Stable semantic id helper for callers that already know a kind and slug. */
export function objectRef(kind: string, slug: string): { id: string } {
  return { id: `${kind}/${slug}` };
}

/** Writes one validated provenance markdown file and returns its absolute path. */
export function writeProvenanceEvent(args: WriteProvenanceEventArgs): string {
  const event = provenanceEventSchema.parse({
    title: args.title,
    event_type: args.event_type,
    process_id: args.process_id,
    actor: args.actor,
    started_at: args.started_at,
    accepted_at: args.accepted_at,
    source_objects: args.source_objects,
    target_objects: args.target_objects,
    outcome: args.outcome,
    tags: args.tags ?? [],
  });
  const dir = join(resolve(args.cwd), "content", "provenance");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = join(dir, `${provenanceSlug(event)}.md`);
  writeFileSync(file, `${toYamlFrontmatter(event)}\nAccepted AI provenance event.\n`, "utf8");
  return file;
}

/** Deterministic filename per accepted event. */
export function provenanceSlug(event: ProvenanceEvent): string {
  const stamp = event.accepted_at.replace(/\D/g, "").slice(0, 14).padEnd(14, "0");
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        process_id: event.process_id,
        source_objects: event.source_objects,
        target_objects: event.target_objects,
        accepted_at: event.accepted_at,
      }),
    )
    .digest("hex")
    .slice(0, 8);
  return `${event.process_id}-${stamp}-${hash}`;
}

/** Narrow deterministic YAML emitter for provenance frontmatter. */
function toYamlFrontmatter(event: ProvenanceEvent): string {
  return [
    "---",
    `title: ${JSON.stringify(event.title)}`,
    `event_type: ${event.event_type}`,
    `process_id: ${event.process_id}`,
    "actor:",
    `  kind: ${event.actor.kind}`,
    "  model:",
    `    provider: ${event.actor.model.provider}`,
    `    model: ${JSON.stringify(event.actor.model.model)}`,
    `    tier: ${event.actor.model.tier}`,
    `started_at: ${JSON.stringify(event.started_at)}`,
    `accepted_at: ${JSON.stringify(event.accepted_at)}`,
    objectRefsYaml("source_objects", event.source_objects),
    objectRefsYaml("target_objects", event.target_objects),
    `outcome: ${event.outcome}`,
    stringArrayYaml("tags", event.tags),
    "---",
    "",
  ].join("\n");
}

function objectRefsYaml(name: string, refs: ReadonlyArray<{ id: string }>): string {
  if (refs.length === 0) return `${name}: []`;
  return [`${name}:`, ...refs.map((ref) => `  - id: ${JSON.stringify(ref.id)}`)].join("\n");
}

function stringArrayYaml(name: string, values: ReadonlyArray<string>): string {
  if (values.length === 0) return `${name}: []`;
  return [`${name}:`, ...values.map((value) => `  - ${JSON.stringify(value)}`)].join("\n");
}
