import type { Kind } from "../schemas/index.ts";

/** Single inventory of public surfaces; consumed by both top nav and `llms.txt` so the list never drifts. */
export interface Surface {
  readonly title: string;
  readonly url: string;
  readonly description: string;
  readonly section: "page" | "listing" | "detail" | "api" | "data" | "feed";
}

/** Listing routes the site exposes; detail routes follow `<url>/[slug]`. */
export const LISTING_KINDS = [
  "claims",
  "thoughts",
  "projects",
  "predictions",
  "changed-my-mind",
  "decisions",
  "inputs",
  "questions",
  "posts",
] as const satisfies ReadonlyArray<Kind>;

/** Stable inventory; ordering is the rendering order in `llms.txt` and homepage nav. */
export const SURFACES: ReadonlyArray<Surface> = [
  { title: "Home", url: "/", description: "Site root and entry points.", section: "page" },
  { title: "Now", url: "/now", description: "What I'm currently focused on.", section: "page" },
  {
    title: "About",
    url: "/about",
    description: "About this site and the author.",
    section: "page",
  },
  {
    title: "Contact",
    url: "/contact",
    description: "Human-readable contact surface.",
    section: "page",
  },
  {
    title: "Claims",
    url: "/claims",
    description: "Atomic structured claims with confidence and evidence.",
    section: "listing",
  },
  {
    title: "Thoughts",
    url: "/thoughts",
    description: "Long-form prose, by recency.",
    section: "listing",
  },
  {
    title: "Inputs",
    url: "/inputs",
    description: "External material that shaped thinking.",
    section: "listing",
  },
  {
    title: "Projects",
    url: "/projects",
    description: "Active and dormant work, grouped by status.",
    section: "listing",
  },
  {
    title: "Predictions",
    url: "/predictions",
    description: "Falsifiable predictions, pending and resolved.",
    section: "listing",
  },
  {
    title: "Changed my mind",
    url: "/changed-my-mind",
    description: "Belief revisions, by date.",
    section: "listing",
  },
  {
    title: "Decisions",
    url: "/decisions",
    description: "ADR-style public decisions.",
    section: "listing",
  },
  {
    title: "Questions",
    url: "/questions",
    description: "Open questions I'm stuck on.",
    section: "listing",
  },
  {
    title: "Posts",
    url: "/posts",
    description: "Long-form evergreen posts with per-section freshness.",
    section: "listing",
  },
  {
    title: "Calibration",
    url: "/predictions/calibration",
    description: "Stated confidence vs realized accuracy.",
    section: "page",
  },
  {
    title: "Claim detail",
    url: "/claims/<slug>",
    description: "Single claim page with confidence history.",
    section: "detail",
  },
  {
    title: "Input detail",
    url: "/inputs/<slug>",
    description: "Single input page.",
    section: "detail",
  },
  {
    title: "Thought detail",
    url: "/thoughts/<slug>",
    description: "Single thought page.",
    section: "detail",
  },
  {
    title: "Project detail",
    url: "/projects/<slug>",
    description: "Single project page.",
    section: "detail",
  },
  {
    title: "Prediction detail",
    url: "/predictions/<slug>",
    description: "Single prediction page.",
    section: "detail",
  },
  {
    title: "Changed-my-mind detail",
    url: "/changed-my-mind/<slug>",
    description: "Single belief-revision page.",
    section: "detail",
  },
  {
    title: "Decision detail",
    url: "/decisions/<slug>",
    description: "Single decision page.",
    section: "detail",
  },
  {
    title: "Question detail",
    url: "/questions/<slug>",
    description: "Single question page.",
    section: "detail",
  },
  {
    title: "Post detail",
    url: "/posts/<slug>",
    description: "Single post page.",
    section: "detail",
  },
  {
    title: "Claims JSON",
    url: "/api/claims.json",
    description: "All claims as JSON.",
    section: "api",
  },
  {
    title: "Inputs JSON",
    url: "/api/inputs.json",
    description: "All inputs as JSON.",
    section: "api",
  },
  {
    title: "Thoughts JSON",
    url: "/api/thoughts.json",
    description: "All thoughts as JSON.",
    section: "api",
  },
  {
    title: "Projects JSON",
    url: "/api/projects.json",
    description: "All projects as JSON.",
    section: "api",
  },
  {
    title: "Predictions JSON",
    url: "/api/predictions.json",
    description: "All predictions as JSON.",
    section: "api",
  },
  {
    title: "Changed-my-mind JSON",
    url: "/api/changed-my-mind.json",
    description: "All belief revisions as JSON.",
    section: "api",
  },
  {
    title: "Decisions JSON",
    url: "/api/decisions.json",
    description: "All decisions as JSON.",
    section: "api",
  },
  {
    title: "Questions JSON",
    url: "/api/questions.json",
    description: "All open questions as JSON.",
    section: "api",
  },
  {
    title: "Posts JSON",
    url: "/api/posts.json",
    description: "All posts as JSON.",
    section: "api",
  },
  {
    title: "Prediction calibration embed JSON",
    url: "/api/embed/prediction-calibration-logger.json",
    description: "Static payload for the local calibration embedded tool.",
    section: "api",
  },
  {
    title: "Contact JSON",
    url: "/contact.json",
    description: "Structured contact surface.",
    section: "data",
  },
  {
    title: "llms.txt",
    url: "/llms.txt",
    description: "Agent-readable surface index.",
    section: "data",
  },
  {
    title: "Personal MCP server",
    url: "mcp://stdio/pnpm%20mcp:me",
    description: "Stdio MCP entrypoint exposing public resources and tools from this repo.",
    section: "data",
  },
  {
    title: "Brain-diff (Atom)",
    url: "/feed/brain-diff.xml",
    description: "Substantive changes across tracked content.",
    section: "feed",
  },
  {
    title: "Brain-diff (JSON)",
    url: "/feed/brain-diff.json",
    description: "Substantive changes as JSON.",
    section: "feed",
  },
  {
    title: "Predictions resolved",
    url: "/feed/predictions-resolved.json",
    description: "Predictions transitioning out of pending.",
    section: "feed",
  },
  {
    title: "Claims revised",
    url: "/feed/claims-revised.json",
    description: "Claim updates across history.",
    section: "feed",
  },
  {
    title: "Decisions reversed",
    url: "/feed/decisions-reversed.json",
    description: "Decision reversals and superseding records.",
    section: "feed",
  },
];

/** Human title per surface section; single source for both nav grouping and llms.txt headings. */
export const SECTION_TITLES = {
  page: "Pages",
  listing: "Listings",
  detail: "Detail patterns",
  api: "JSON APIs",
  data: "Data files",
  feed: "Feeds",
} as const satisfies Record<Surface["section"], string>;

/** Order sections render in `llms.txt`; the coverage assertion below catches new sections that lack placement. */
export const SECTION_ORDER = [
  "page",
  "listing",
  "detail",
  "api",
  "data",
  "feed",
] as const satisfies ReadonlyArray<Surface["section"]>;

type MissingSection = Exclude<Surface["section"], (typeof SECTION_ORDER)[number]>;
const _sectionOrderCoverage: MissingSection extends never ? true : never = true;
void _sectionOrderCoverage;

/** Subset shown in the top navigation; keeps nav focused on landings, not detail patterns. */
export const NAV_SURFACES: ReadonlyArray<Surface> = SURFACES.filter(
  (s) => s.section === "listing" || (s.section === "page" && s.url !== "/"),
);
