import type { z } from "zod";
import { KIND_SCHEMAS, KINDS, type Kind, type LinkFieldMap } from "../schemas/index.ts";

/** MCP public view names; kept as a string-literal union so registry consumers can derive the zod enum. */
export type PublicViewName =
  | "thoughts"
  | "claims"
  | "projects"
  | "decisions"
  | "predictions"
  | "inputs"
  | "inputs_recent"
  | "questions"
  | "current_focus"
  | "claims_recent"
  | "claims_by_tag"
  | "projects_active"
  | "decisions_recent"
  | "predictions_pending"
  | "predictions_resolved"
  | "provenance";

/** MCP exposure flags for one kind; `detail` toggles the `<uri>/{slug}` resource, `listView` is the canonical list view name when present. */
export interface KindMcpSpec {
  readonly detail: boolean;
  readonly listView?: PublicViewName;
}

/** Per-kind registry entry; the single fact-source the site, MCP server, and CLIs read from. */
export interface KindRegistryEntry<S extends z.ZodTypeAny = z.ZodTypeAny> {
  readonly schema: S;
  readonly linkFields: LinkFieldMap;
  readonly route: string | null;
  readonly titleField: string;
  readonly dateField: string;
  readonly statusField?: string;
  readonly nav: boolean;
  readonly api: boolean;
  readonly mcp: KindMcpSpec;
  readonly description: string;
  readonly listingTitle: string;
  readonly detailTitle: string;
  readonly detailDescription: string;
  readonly apiTitle?: string;
  readonly apiDescription?: string;
  readonly feeds?: ReadonlyArray<string>;
}

/** Single registry covering every kind exactly; downstream surfaces never branch on kind without consulting this. */
export const KIND_REGISTRY = {
  thoughts: {
    schema: KIND_SCHEMAS.thoughts.schema,
    linkFields: KIND_SCHEMAS.thoughts.linkFields,
    route: "/thoughts",
    titleField: "title",
    dateField: "updated",
    nav: true,
    api: true,
    mcp: { detail: true, listView: "thoughts" },
    description: "Long-form prose, by recency.",
    listingTitle: "Thoughts",
    detailTitle: "Thought detail",
    detailDescription: "Single thought page.",
    apiTitle: "Thoughts JSON",
    apiDescription: "All thoughts as JSON.",
  },
  claims: {
    schema: KIND_SCHEMAS.claims.schema,
    linkFields: KIND_SCHEMAS.claims.linkFields,
    route: "/claims",
    titleField: "claim",
    dateField: "last_reviewed",
    statusField: "status",
    nav: true,
    api: true,
    mcp: { detail: true, listView: "claims" },
    description: "Atomic structured claims with confidence and evidence.",
    listingTitle: "Claims",
    detailTitle: "Claim detail",
    detailDescription: "Single claim page with confidence history.",
    apiTitle: "Claims JSON",
    apiDescription: "All claims as JSON.",
  },
  projects: {
    schema: KIND_SCHEMAS.projects.schema,
    linkFields: KIND_SCHEMAS.projects.linkFields,
    route: "/projects",
    titleField: "title",
    dateField: "started",
    statusField: "status",
    nav: true,
    api: true,
    mcp: { detail: true, listView: "projects" },
    description: "Active and dormant work, grouped by status.",
    listingTitle: "Projects",
    detailTitle: "Project detail",
    detailDescription: "Single project page.",
    apiTitle: "Projects JSON",
    apiDescription: "All projects as JSON.",
  },
  predictions: {
    schema: KIND_SCHEMAS.predictions.schema,
    linkFields: KIND_SCHEMAS.predictions.linkFields,
    route: "/predictions",
    titleField: "prediction",
    dateField: "made",
    statusField: "resolution",
    nav: true,
    api: true,
    mcp: { detail: true, listView: "predictions" },
    description: "Falsifiable predictions, pending and resolved.",
    listingTitle: "Predictions",
    detailTitle: "Prediction detail",
    detailDescription: "Single prediction page.",
    apiTitle: "Predictions JSON",
    apiDescription: "All predictions as JSON.",
    feeds: ["predictions-resolved"],
  },
  "changed-my-mind": {
    schema: KIND_SCHEMAS["changed-my-mind"].schema,
    linkFields: KIND_SCHEMAS["changed-my-mind"].linkFields,
    route: "/changed-my-mind",
    titleField: "title",
    dateField: "date",
    nav: true,
    api: true,
    mcp: { detail: true },
    description: "Belief revisions, by date.",
    listingTitle: "Changed my mind",
    detailTitle: "Changed-my-mind detail",
    detailDescription: "Single belief-revision page.",
    apiTitle: "Changed-my-mind JSON",
    apiDescription: "All belief revisions as JSON.",
  },
  decisions: {
    schema: KIND_SCHEMAS.decisions.schema,
    linkFields: KIND_SCHEMAS.decisions.linkFields,
    route: "/decisions",
    titleField: "decision",
    dateField: "date",
    statusField: "status",
    nav: true,
    api: true,
    mcp: { detail: true, listView: "decisions" },
    description: "ADR-style public decisions.",
    listingTitle: "Decisions",
    detailTitle: "Decision detail",
    detailDescription: "Single decision page.",
    apiTitle: "Decisions JSON",
    apiDescription: "All decisions as JSON.",
    feeds: ["decisions-reversed"],
  },
  questions: {
    schema: KIND_SCHEMAS.questions.schema,
    linkFields: KIND_SCHEMAS.questions.linkFields,
    route: "/questions",
    titleField: "question",
    dateField: "asked",
    statusField: "status",
    nav: true,
    api: true,
    mcp: { detail: true, listView: "questions" },
    description: "Open questions I'm stuck on.",
    listingTitle: "Questions",
    detailTitle: "Question detail",
    detailDescription: "Single question page.",
    apiTitle: "Questions JSON",
    apiDescription: "All open questions as JSON.",
  },
  posts: {
    schema: KIND_SCHEMAS.posts.schema,
    linkFields: KIND_SCHEMAS.posts.linkFields,
    route: "/posts",
    titleField: "title",
    dateField: "updated",
    nav: true,
    api: true,
    mcp: { detail: true },
    description: "Long-form evergreen posts with per-section freshness.",
    listingTitle: "Posts",
    detailTitle: "Post detail",
    detailDescription: "Single post page.",
    apiTitle: "Posts JSON",
    apiDescription: "All posts as JSON.",
  },
  inputs: {
    schema: KIND_SCHEMAS.inputs.schema,
    linkFields: KIND_SCHEMAS.inputs.linkFields,
    route: "/inputs",
    titleField: "title",
    dateField: "consumed",
    nav: true,
    api: true,
    mcp: { detail: true, listView: "inputs" },
    description: "External material that shaped thinking.",
    listingTitle: "Inputs",
    detailTitle: "Input detail",
    detailDescription: "Single input page.",
    apiTitle: "Inputs JSON",
    apiDescription: "All inputs as JSON.",
  },
  provenance: {
    schema: KIND_SCHEMAS.provenance.schema,
    linkFields: KIND_SCHEMAS.provenance.linkFields,
    route: null,
    titleField: "title",
    dateField: "accepted_at",
    nav: false,
    api: true,
    mcp: { detail: true, listView: "provenance" },
    description: "AI provenance events for accepted, edited, or merged content effects.",
    listingTitle: "Provenance",
    detailTitle: "Provenance detail",
    detailDescription: "Single provenance event.",
  },
} as const satisfies Record<Kind, KindRegistryEntry>;

/** Kinds that get a public listing in the top nav and on the homepage. */
export const LISTING_KINDS = KINDS.filter((k) => KIND_REGISTRY[k].nav) as ReadonlyArray<Kind>;

/** Resolve the human-readable title for an entry by consulting the kind's registered `titleField`, then falling back to slug. */
export function titleFor(
  kind: Kind,
  frontmatter: Record<string, unknown>,
  fallback: string,
): string {
  const titleKey = KIND_REGISTRY[kind].titleField;
  const candidates = ["title", titleKey];
  for (const key of candidates) {
    const value = frontmatter[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return fallback;
}

/** Pure predicate operating on frontmatter; used to express per-view filters that the MCP store applies after fan-out. */
export type FrontmatterPredicate = (fm: Record<string, unknown>) => boolean;

/** One row in the public-views inventory; the optional `kinds`/`predicate` move per-view filter logic out of the MCP store. */
export interface PublicViewSpec {
  readonly view: PublicViewName;
  readonly kind: Kind;
  readonly uri: string;
  readonly title: string;
  readonly description: string;
  readonly resource: "static" | "template";
  /** Composite views (e.g. `current_focus`) span multiple kinds; defaults to `[kind]`. */
  readonly kinds?: ReadonlyArray<Kind>;
  /** Per-kind frontmatter predicate; only items satisfying their kind's predicate are returned. */
  readonly predicates?: Readonly<Partial<Record<Kind, FrontmatterPredicate>>>;
}

/** Status helper for predicates that check `frontmatter.status`. */
function statusEquals(value: string): FrontmatterPredicate {
  return (fm) => fm["status"] === value;
}

/** Status helper for predicates that check membership in a set of statuses. */
function statusIn(values: ReadonlyArray<string>): FrontmatterPredicate {
  return (fm) => values.includes(String(fm["status"] ?? ""));
}

/** Resolution helper for predicates that check `frontmatter.resolution`. */
function resolutionEquals(value: string): FrontmatterPredicate {
  return (fm) => fm["resolution"] === value;
}

/** Resolution helper for predicates that check `frontmatter.resolution !== value`. */
function resolutionNotEquals(value: string): FrontmatterPredicate {
  return (fm) => fm["resolution"] !== value;
}

/** Every public MCP view; static views become fixed resources, template views are URI templates. */
export const PUBLIC_VIEWS = [
  {
    view: "thoughts",
    kind: "thoughts",
    uri: "thinkinglabs://thoughts",
    title: "thinkinglabs:thoughts",
    description: "Public thoughts view from the personal repo.",
    resource: "static",
  },
  {
    view: "claims",
    kind: "claims",
    uri: "thinkinglabs://claims",
    title: "thinkinglabs:claims",
    description: "Public claims view from the personal repo.",
    resource: "static",
  },
  {
    view: "projects",
    kind: "projects",
    uri: "thinkinglabs://projects",
    title: "thinkinglabs:projects",
    description: "Public projects view from the personal repo.",
    resource: "static",
  },
  {
    view: "decisions",
    kind: "decisions",
    uri: "thinkinglabs://decisions",
    title: "thinkinglabs:decisions",
    description: "Public decisions view from the personal repo.",
    resource: "static",
  },
  {
    view: "predictions",
    kind: "predictions",
    uri: "thinkinglabs://predictions",
    title: "thinkinglabs:predictions",
    description: "Public predictions view from the personal repo.",
    resource: "static",
  },
  {
    view: "inputs",
    kind: "inputs",
    uri: "thinkinglabs://inputs",
    title: "thinkinglabs:inputs",
    description: "Public inputs view from the personal repo.",
    resource: "static",
  },
  {
    view: "inputs_recent",
    kind: "inputs",
    uri: "thinkinglabs://inputs/recent",
    title: "thinkinglabs:inputs/recent",
    description: "Most-recent inputs.",
    resource: "static",
  },
  {
    view: "questions",
    kind: "questions",
    uri: "thinkinglabs://questions",
    title: "thinkinglabs:questions",
    description: "Public open questions.",
    resource: "static",
  },
  {
    view: "current_focus",
    kind: "projects",
    uri: "thinkinglabs://current_focus",
    title: "thinkinglabs:current_focus",
    description: "Composite current-focus view (alive projects, recent thoughts, open questions).",
    resource: "static",
    kinds: ["projects", "thoughts", "questions"],
    predicates: {
      projects: statusEquals("alive"),
      questions: statusIn(["open", "partial"]),
    },
  },
  {
    view: "claims_recent",
    kind: "claims",
    uri: "thinkinglabs://claims/recent",
    title: "thinkinglabs:claims/recent",
    description: "Most-recent claims.",
    resource: "static",
  },
  {
    view: "claims_by_tag",
    kind: "claims",
    uri: "thinkinglabs://claims/by-tag/{tag}",
    title: "thinkinglabs:claims/by-tag/{tag}",
    description: "Claims filtered by one tag.",
    resource: "template",
  },
  {
    view: "projects_active",
    kind: "projects",
    uri: "thinkinglabs://projects/active",
    title: "thinkinglabs:projects/active",
    description: "Projects with status=alive.",
    resource: "static",
    predicates: { projects: statusEquals("alive") },
  },
  {
    view: "decisions_recent",
    kind: "decisions",
    uri: "thinkinglabs://decisions/recent",
    title: "thinkinglabs:decisions/recent",
    description: "Most-recent decisions.",
    resource: "static",
  },
  {
    view: "predictions_pending",
    kind: "predictions",
    uri: "thinkinglabs://predictions/pending",
    title: "thinkinglabs:predictions/pending",
    description: "Pending predictions.",
    resource: "static",
    predicates: { predictions: resolutionEquals("pending") },
  },
  {
    view: "predictions_resolved",
    kind: "predictions",
    uri: "thinkinglabs://predictions/resolved",
    title: "thinkinglabs:predictions/resolved",
    description: "Resolved predictions.",
    resource: "static",
    predicates: { predictions: resolutionNotEquals("pending") },
  },
  {
    view: "provenance",
    kind: "provenance",
    uri: "thinkinglabs://provenance",
    title: "thinkinglabs:provenance",
    description: "AI provenance event log.",
    resource: "static",
  },
] as const satisfies ReadonlyArray<PublicViewSpec>;

/** Compile-time assertion that PUBLIC_VIEWS covers every PublicViewName exactly. */
type _ViewCoverage = Exclude<PublicViewName, (typeof PUBLIC_VIEWS)[number]["view"]>;
const _viewCoverage: [_ViewCoverage] extends [never] ? true : never = true;
void _viewCoverage;

/** Kinds with a `<uri>/{slug}` MCP detail resource; derived from the registry. */
export const DETAIL_KINDS = KINDS.filter((k) => KIND_REGISTRY[k].mcp.detail) as ReadonlyArray<Kind>;
