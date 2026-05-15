import type { CollectionEntry } from "astro:content";
import { KIND_REGISTRY, titleFor } from "./registry.ts";
import { detailHref } from "./entity-routes.ts";
import { stripKindPrefix, stripMdExt } from "./refs.ts";
import { KINDS, type Kind } from "../schemas/index.ts";

/** A single node in the knowledge graph; one per content entry across all kinds. */
export interface GraphNode {
  /** Stable globally-unique id of the form `<kind>/<slug>`. */
  readonly id: string;
  readonly kind: Kind;
  readonly slug: string;
  readonly title: string;
  /** Public detail-page URL; absent for kinds without a public route (e.g. provenance). */
  readonly href: string | null;
  /** Number of outgoing + incoming typed edges. Used to vary node size by degree. */
  readonly degree: number;
}

/** A typed edge between two graph nodes; `label` is the schema-defined edge label. */
export interface GraphEdge {
  /** Source node id as `<kind>/<slug>`. */
  readonly from: string;
  /** Target node id as `<kind>/<slug>`. */
  readonly to: string;
  /** Typed edge label as declared by the source kind's `linkFields`. */
  readonly label: string;
}

/** Whole-graph payload shipped from build-time Astro frontmatter to the client. */
export interface NetworkGraph {
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly edges: ReadonlyArray<GraphEdge>;
}

/** One kind's entries, typed loosely so a heterogeneous record can be passed in by the Astro page. */
export type EntriesByKind = Readonly<Partial<Record<Kind, ReadonlyArray<CollectionEntry<Kind>>>>>;

const KIND_SET = new Set<Kind>(KINDS);

/** Parse a frontmatter link reference like `claims/foo` or `foo.md` into a `<kind>/<slug>` id. */
function refToId(ref: string, fallbackKind: Kind): string {
  const withoutAnchor = ref.split("#")[0] ?? ref;
  const normalized = stripMdExt(withoutAnchor);
  const [maybeKind, ...rest] = normalized.split("/");
  if (maybeKind !== undefined && KIND_SET.has(maybeKind as Kind) && rest.length > 0) {
    return `${maybeKind}/${rest.join("/")}`;
  }
  return `${fallbackKind}/${stripKindPrefix(normalized)}`;
}

function refCandidateIds(ref: string, fallbackKinds: readonly Kind[]): string[] {
  const withoutAnchor = ref.split("#")[0] ?? ref;
  const normalized = stripMdExt(withoutAnchor);
  const [maybeKind, ...rest] = normalized.split("/");
  if (maybeKind !== undefined && KIND_SET.has(maybeKind as Kind) && rest.length > 0) {
    return [`${maybeKind}/${rest.join("/")}`];
  }
  const slug = stripKindPrefix(normalized);
  return fallbackKinds.map((kind) => `${kind}/${slug}`);
}

/** Pick a sensible fallback kind for an unprefixed link ref; mirrors the per-field semantics from each kind's Zod schema. */
function fallbackKindFor(sourceKind: Kind, fieldName: string): Kind {
  if (sourceKind === "claims" && fieldName === "derived_from") return "thoughts";
  if (sourceKind === "thoughts" && fieldName === "inputs") return "inputs";
  if (sourceKind === "thoughts" && fieldName === "observations") return "observations";
  if (sourceKind === "predictions" && fieldName === "evidence_at_time") return "thoughts";
  if (fieldName === "related_claims" || fieldName === "supersedes" || fieldName === "superseded_by")
    return "claims";
  if (fieldName === "related_thoughts") return "thoughts";
  if (fieldName === "related_observations") return "observations";
  if (fieldName === "related_projects") return "projects";
  if (fieldName === "reverses") return "decisions";
  if (fieldName === "superseded_claims") return "claims";
  if (fieldName === "claims") return "claims";
  return sourceKind;
}

/** Build the full graph from the cross-kind collection map; pure and unit-testable. */
export function buildNetworkGraph(entriesByKind: EntriesByKind): NetworkGraph {
  const nodesById = new Map<string, GraphNode & { degreeMut: number }>();
  const edges: GraphEdge[] = [];

  for (const kind of KINDS) {
    const entries = entriesByKind[kind];
    if (!entries) continue;
    const registry = KIND_REGISTRY[kind];
    for (const entry of entries) {
      const id = `${kind}/${entry.id}`;
      const title = titleFor(kind, entry.data as Record<string, unknown>, entry.id);
      const href = registry.route ? detailHref(kind, entry.id) : null;
      nodesById.set(id, {
        id,
        kind,
        slug: entry.id,
        title,
        href,
        degree: 0,
        degreeMut: 0,
      });
    }
  }

  for (const kind of KINDS) {
    const entries = entriesByKind[kind];
    if (!entries) continue;
    const linkFields = KIND_REGISTRY[kind].linkFields;
    for (const entry of entries) {
      const fromId = `${kind}/${entry.id}`;
      const data = entry.data as Record<string, unknown>;
      for (const [fieldName, label] of Object.entries(linkFields)) {
        const raw = data[fieldName];
        if (!Array.isArray(raw)) continue;
        const fallback = fallbackKindFor(kind, fieldName);
        for (const ref of raw) {
          if (typeof ref !== "string" || ref.length === 0) continue;
          const candidates =
            kind === "predictions" && fieldName === "evidence_at_time"
              ? refCandidateIds(ref, ["thoughts", "inputs", "observations"])
              : [refToId(ref, fallback)];
          const toId = candidates.find((candidate) => nodesById.has(candidate));
          if (toId === undefined) continue;
          if (!nodesById.has(toId) || toId === fromId) continue;
          edges.push({ from: fromId, to: toId, label });
          nodesById.get(fromId)!.degreeMut += 1;
          nodesById.get(toId)!.degreeMut += 1;
        }
      }
    }
  }

  const nodes: GraphNode[] = Array.from(nodesById.values()).map((n) => ({
    id: n.id,
    kind: n.kind,
    slug: n.slug,
    title: n.title,
    href: n.href,
    degree: n.degreeMut,
  }));

  return { nodes, edges };
}
