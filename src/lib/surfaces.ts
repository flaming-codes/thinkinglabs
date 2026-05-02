import { type Kind } from "../schemas/index.ts";
import { KIND_REGISTRY, LISTING_KINDS, type KindRegistryEntry } from "./registry.ts";

export { LISTING_KINDS } from "./registry.ts";

/** Widened registry entry used for surface derivation; the strict literal type narrows too aggressively for `??` fallbacks. */
type KindSpecRuntime = KindRegistryEntry & {
  readonly listingTitle: string;
  readonly detailTitle: string;
  readonly detailDescription: string;
  readonly apiTitle?: string;
  readonly apiDescription?: string;
};

/** Single inventory of public surfaces; consumed by both top nav and `llms.txt` so the list never drifts. */
export interface Surface {
  readonly title: string;
  readonly url: string;
  readonly description: string;
  readonly section: "page" | "listing" | "detail" | "api" | "data" | "feed";
}

/** Display order for kind-derived sections in `llms.txt` and the homepage; preserves the historical ordering of the hand-rolled inventory. */
const LISTING_DISPLAY_ORDER = [
  "claims",
  "thoughts",
  "inputs",
  "projects",
  "predictions",
  "changed-my-mind",
  "decisions",
  "questions",
  "posts",
] as const satisfies ReadonlyArray<Kind>;

const LISTING_ORDERED: ReadonlyArray<Kind> = LISTING_DISPLAY_ORDER.filter((k) =>
  LISTING_KINDS.includes(k),
);

/** Display order for detail-pattern surfaces; matches the historical hand-rolled inventory. */
const DETAIL_DISPLAY_ORDER = [
  "claims",
  "inputs",
  "thoughts",
  "projects",
  "predictions",
  "changed-my-mind",
  "decisions",
  "questions",
  "posts",
] as const satisfies ReadonlyArray<Kind>;

const DETAIL_ORDERED: ReadonlyArray<Kind> = DETAIL_DISPLAY_ORDER.filter((k) =>
  LISTING_KINDS.includes(k),
);

/** Static (non-per-kind) page surfaces; ordering reflects rendering order in `llms.txt` and top nav. */
const STATIC_PAGES: ReadonlyArray<Surface> = [
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
];

/** Standalone (non-listing, non-detail) page surfaces appended after kind sections. */
const EXTRA_PAGES: ReadonlyArray<Surface> = [
  {
    title: "Calibration",
    url: "/predictions/calibration",
    description: "Stated confidence vs realized accuracy.",
    section: "page",
  },
];

/** Static data and feed surfaces appended after the per-kind sections. */
const TAIL_SURFACES: ReadonlyArray<Surface> = [
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
    url: "mcp://stdio/pnpm%20mcp:thinkinglabs",
    description: "Stdio MCP entrypoint exposing public resources and tools from this repo.",
    section: "data",
  },
  {
    title: "Brain-diff (Atom)",
    url: "/feed/brain-diff.xml",
    description:
      "Substantive changes across tracked content (scored daily by `pnpm brain-diff`; not yet auto-deployed — currently published as a CI artifact only).",
    section: "feed",
  },
  {
    title: "Brain-diff (JSON)",
    url: "/feed/brain-diff.json",
    description:
      "Substantive changes as JSON (scored daily by `pnpm brain-diff`; not yet auto-deployed — currently published as a CI artifact only).",
    section: "feed",
  },
  {
    title: "Predictions resolved",
    url: "/feed/predictions-resolved.json",
    description: "Predictions transitioning out of pending (live, regenerated every site build).",
    section: "feed",
  },
  {
    title: "Claims revised",
    url: "/feed/claims-revised.json",
    description:
      "Claims with non-active status or supersedes/superseded_by links (live, regenerated every site build).",
    section: "feed",
  },
  {
    title: "Decisions reversed",
    url: "/feed/decisions-reversed.json",
    description:
      "Decisions marked reversed/superseded or with a `reverses` link (live, regenerated every site build).",
    section: "feed",
  },
];

/** Per-kind listing surface derived from the registry. */
function listingSurface(kind: Kind): Surface {
  const spec = KIND_REGISTRY[kind] as KindSpecRuntime;
  if (!spec.route) throw new Error(`registry: kind "${kind}" has nav=true but no route`);
  return {
    title: spec.listingTitle,
    url: spec.route,
    description: spec.description,
    section: "listing",
  };
}

/** Per-kind detail surface derived from the registry. */
function detailSurface(kind: Kind): Surface {
  const spec = KIND_REGISTRY[kind] as KindSpecRuntime;
  if (!spec.route) throw new Error(`registry: kind "${kind}" has nav=true but no route`);
  return {
    title: spec.detailTitle,
    url: `${spec.route}/<slug>`,
    description: spec.detailDescription,
    section: "detail",
  };
}

/** Per-kind JSON API surface derived from the registry. */
function apiSurface(kind: Kind): Surface | null {
  const spec = KIND_REGISTRY[kind] as KindSpecRuntime;
  if (!spec.api || !spec.route) return null;
  return {
    title: spec.apiTitle ?? `${spec.listingTitle} JSON`,
    url: `/api/${kind}.json`,
    description: spec.apiDescription ?? `All ${kind} as JSON.`,
    section: "api",
  };
}

/** Stable inventory; ordering is the rendering order in `llms.txt` and homepage nav. */
export const SURFACES: ReadonlyArray<Surface> = [
  ...STATIC_PAGES,
  ...LISTING_ORDERED.map(listingSurface),
  ...EXTRA_PAGES,
  ...DETAIL_ORDERED.map(detailSurface),
  ...LISTING_ORDERED.map(apiSurface).filter((s): s is Surface => s !== null),
  ...TAIL_SURFACES,
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
