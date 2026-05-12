import matter from "gray-matter";
import { z } from "zod";
import { getCollection } from "astro:content";
import type { Kind } from "../schemas/index.ts";
import { detailHref, formatDate } from "./entity-routes.ts";
import { KIND_REGISTRY, titleFor, type KindRegistryEntry } from "./registry.ts";

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const jsonObjectSchema = z.record(z.string(), jsonValueSchema);

const PUBLIC_MARKDOWN_KINDS = [
  "thoughts",
  "claims",
  "projects",
  "predictions",
  "changed-my-mind",
  "decisions",
  "questions",
  "posts",
  "inputs",
] as const satisfies ReadonlyArray<Kind>;

const publicMarkdownKindSchema = z.enum(PUBLIC_MARKDOWN_KINDS);

const MARKDOWN_LINK_FIELDS = [
  "claims",
  "inputs",
  "related_claims",
  "related_thoughts",
  "related_projects",
  "superseded_claims",
  "supersedes",
  "superseded_by",
  "reverses",
  "derived_from",
] as const;

const markdownLinkFieldSchema = z.enum(MARKDOWN_LINK_FIELDS);

const resolvedLinkSchema = z
  .object({
    status: z.literal("resolved"),
    ref: z.string().min(1),
    kind: publicMarkdownKindSchema,
    slug: z.string().min(1),
    title: z.string().min(1),
    url: z.string().min(1),
  })
  .strict();

const unresolvedLinkSchema = z
  .object({
    status: z.literal("unresolved"),
    ref: z.string().min(1),
    slug: z.string().min(1),
    expected_kinds: z.array(publicMarkdownKindSchema).min(1),
  })
  .strict();

const detailLinkSchema = z.discriminatedUnion("status", [resolvedLinkSchema, unresolvedLinkSchema]);

const detailLinksSchema = z
  .record(z.string(), z.array(detailLinkSchema))
  .superRefine((links, ctx) => {
    for (const field of Object.keys(links)) {
      const result = markdownLinkFieldSchema.safeParse(field);
      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          message: `Unknown Markdown link field "${field}"`,
          path: [field],
        });
      }
    }
  });

/** Contract for detail-page Markdown YAML envelopes. */
export const markdownDetailEnvelopeSchema = z
  .object({
    variant: z.literal("detail"),
    kind: publicMarkdownKindSchema,
    slug: z.string().min(1),
    url: z.string().min(1),
    title: z.string().min(1),
    source_path: z.string().min(1),
    frontmatter: jsonObjectSchema,
    links: detailLinksSchema.optional(),
  })
  .strict();

/** Contract for listing-page Markdown YAML envelopes. */
export const markdownListingEnvelopeSchema = z
  .object({
    variant: z.literal("listing"),
    kind: publicMarkdownKindSchema,
    url: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    count: z.number().int().nonnegative(),
  })
  .strict();

/** Contract for static-page Markdown YAML envelopes. */
export const markdownStaticEnvelopeSchema = z
  .object({
    variant: z.literal("static"),
    url: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
  })
  .strict();

/** Union contract for every emitted Markdown YAML envelope. */
export const markdownEnvelopeSchema = z.union([
  markdownDetailEnvelopeSchema,
  markdownListingEnvelopeSchema,
  markdownStaticEnvelopeSchema,
]);

/** Validated detail-page Markdown envelope shape. */
export type MarkdownDetailEnvelope = z.infer<typeof markdownDetailEnvelopeSchema>;
/** Validated listing-page Markdown envelope shape. */
export type MarkdownListingEnvelope = z.infer<typeof markdownListingEnvelopeSchema>;
/** Validated static-page Markdown envelope shape. */
export type MarkdownStaticEnvelope = z.infer<typeof markdownStaticEnvelopeSchema>;
/** Validated Markdown envelope shape across all route variants. */
export type MarkdownEnvelope = z.infer<typeof markdownEnvelopeSchema>;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { readonly [key: string]: JsonValue };

interface MarkdownEntry {
  readonly id: string;
  readonly data: Record<string, unknown>;
  readonly body?: string;
}

type PublicMarkdownKind = (typeof PUBLIC_MARKDOWN_KINDS)[number];

interface PublicKindBundle {
  readonly kind: PublicMarkdownKind;
  readonly entries: ReadonlyArray<MarkdownEntry>;
}

interface DetailMarkdownRecord {
  readonly kind: PublicMarkdownKind;
  readonly slug: string;
  readonly route: string;
  readonly markdownSlug: string;
  readonly markdown: string;
}

interface ListingMarkdownRecord {
  readonly kind: PublicMarkdownKind;
  readonly route: string;
  readonly markdownSlug: string;
  readonly markdown: string;
}

interface StaticMarkdownRecord {
  readonly route: string;
  readonly markdownSlug: string;
  readonly markdown: string;
}

/** Fully rendered Markdown route generated for Astro static paths and responses. */
export type MarkdownRouteRecord =
  | DetailMarkdownRecord
  | ListingMarkdownRecord
  | StaticMarkdownRecord;

const STATIC_MARKDOWN_PAGES = [
  {
    route: "/",
    markdownSlug: "index",
    title: "thinkinglabs",
    description: "Site root and entry points.",
    body: [
      "# thinkinglabs",
      "",
      "thinkinglabs is a public working surface generated from a markdown repository.",
      "",
      "The HTML site, JSON APIs, feeds, MCP resources, and `.md` page variants are derived from the same validated source tree.",
    ].join("\n"),
  },
  {
    route: "/about",
    markdownSlug: "about",
    title: "About",
    description: "About this site and the author.",
    body: [
      "# About",
      "",
      "thinkinglabs is a public working surface.",
      "",
      "Canonical public content pages, listings, and selected static pages have agent-readable Markdown siblings: append `.md` to the slashless page URL, or use `/index.md` for the homepage.",
      "",
      "Detail variants preserve the source markdown body. Listing and static variants are compact summaries with contract-validated envelopes over the same repository-backed system that feeds the web UI, JSON APIs, SQLite index, feeds, and MCP surfaces.",
    ].join("\n"),
  },
  {
    route: "/agents",
    markdownSlug: "agents",
    title: "For agents",
    description: "MCP server, llms.txt, JSON APIs, and feed surfaces.",
    body: [
      "# For agents",
      "",
      "Agent-readable surfaces include `/llms.txt`, `/api/<kind>.json`, public feed files, MCP resources, and `.md` page variants.",
      "",
      "Use `.md` variants when the target is a page-shaped representation and JSON or MCP when the target is structured query access.",
    ].join("\n"),
  },
  {
    route: "/brain-diff",
    markdownSlug: "brain-diff",
    title: "Brain diff",
    description: "Substantive changes across tracked content.",
    body: [
      "# Brain diff",
      "",
      "Brain diff feeds summarize substantive changes across tracked public content.",
    ].join("\n"),
  },
  {
    route: "/contact",
    markdownSlug: "contact",
    title: "Contact",
    description: "Human-readable contact surface.",
    body: [
      "# Contact",
      "",
      "The contact page is the human-readable contact surface. Structured contact data is available at `/contact.json`.",
    ].join("\n"),
  },
  {
    route: "/graph",
    markdownSlug: "graph",
    title: "Graph",
    description: "Full-screen 3D rendering of the knowledge network.",
    body: [
      "# Graph",
      "",
      "The graph page renders the public knowledge network. Use the collection APIs or MCP resources for structured graph-like traversal.",
    ].join("\n"),
  },
  {
    route: "/now",
    markdownSlug: "now",
    title: "Now",
    description: "Current focus.",
    body: [
      "# Now",
      "",
      "The now page summarizes current focus from public projects and recent inputs.",
    ].join("\n"),
  },
  {
    route: "/privacy",
    markdownSlug: "privacy",
    title: "Privacy",
    description: "Privacy notes for the static site.",
    body: [
      "# Privacy",
      "",
      "thinkinglabs is a static site generated from a public markdown repository. The deployed site does not need a production Node runtime.",
    ].join("\n"),
  },
  {
    route: "/predictions/calibration",
    markdownSlug: "predictions/calibration",
    title: "Prediction calibration",
    description: "Stated confidence vs realized accuracy.",
    body: [
      "# Prediction calibration",
      "",
      "The calibration page compares stated confidence against realized prediction outcomes.",
    ].join("\n"),
  },
] as const;

const LINK_FIELD_TARGETS: Readonly<
  Record<(typeof MARKDOWN_LINK_FIELDS)[number], ReadonlyArray<PublicMarkdownKind>>
> = {
  claims: ["claims"],
  inputs: ["inputs"],
  related_claims: ["claims"],
  related_thoughts: ["thoughts"],
  related_projects: ["projects"],
  superseded_claims: ["claims"],
  supersedes: ["claims"],
  superseded_by: ["claims"],
  reverses: ["decisions"],
  derived_from: ["thoughts", "claims", "posts", "decisions", "projects", "inputs", "questions"],
};

let markdownRouteRecordsPromise: Promise<MarkdownRouteRecord[]> | null = null;

/** Convert a canonical public HTML route into its Markdown sibling URL. */
export function markdownUrlForRoute(route: string): string {
  if (route === "/") return "/index.md";
  return `${route.replace(/\/$/, "")}.md`;
}

/** Enumerate Astro static paths for every public Markdown URL variant. */
export async function getMarkdownStaticPaths(): Promise<Array<{ params: { slug: string } }>> {
  const records = await getCachedMarkdownRouteRecords();
  return records.map((record) => ({ params: { slug: record.markdownSlug } }));
}

/** Return the static Markdown response for a catch-all route slug, or a Markdown 404. */
export async function markdownResponseForSlug(slug: string | undefined): Promise<Response> {
  if (!slug) return notFoundMarkdownResponse();
  const records = await getCachedMarkdownRouteRecords();
  const record = records.find((candidate) => candidate.markdownSlug === slug);
  if (!record) return notFoundMarkdownResponse();
  return new Response(record.markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}

/** Build the complete public Markdown route inventory from static pages and public collections. */
export async function buildMarkdownRouteRecords(): Promise<MarkdownRouteRecord[]> {
  const bundles = await loadPublicKindBundles();
  const lookup = buildEntryLookup(bundles);
  return assertUniqueMarkdownSlugs([
    ...STATIC_MARKDOWN_PAGES.map((page) => staticRecord(page)),
    ...bundles.map((bundle) => listingRecord(bundle)),
    ...bundles.flatMap((bundle) =>
      bundle.entries.map((entry) => detailRecord(bundle.kind, entry, lookup)),
    ),
  ]);
}

async function getCachedMarkdownRouteRecords(): Promise<MarkdownRouteRecord[]> {
  markdownRouteRecordsPromise ??= buildMarkdownRouteRecords();
  return markdownRouteRecordsPromise;
}

/** Serialize one public collection entry as a detail Markdown document. */
export function renderDetailMarkdown(args: {
  readonly kind: PublicMarkdownKind;
  readonly entry: MarkdownEntry;
  readonly lookup?: EntryLookup;
}): string {
  const route = detailHref(args.kind, args.entry.id);
  const frontmatter = toJsonObject(args.entry.data);
  const links = resolveLinks(args.kind, args.entry, args.lookup ?? new Map());
  const envelopeInput: Omit<MarkdownDetailEnvelope, "links"> & {
    readonly links?: MarkdownDetailEnvelope["links"];
  } = {
    variant: "detail",
    kind: args.kind,
    slug: args.entry.id,
    url: route,
    title: titleFor(args.kind, args.entry.data, args.entry.id),
    source_path: `content/${args.kind}/${args.entry.id}.md`,
    frontmatter,
  };
  const envelope = markdownDetailEnvelopeSchema.parse(
    links ? { ...envelopeInput, links } : envelopeInput,
  );
  return stringifyMarkdown(envelope, args.entry.body ?? "");
}

/** Serialize one public collection listing as a Markdown document. */
export function renderListingMarkdown(args: {
  readonly kind: PublicMarkdownKind;
  readonly entries: ReadonlyArray<MarkdownEntry>;
}): string {
  const spec = KIND_REGISTRY[args.kind];
  if (!spec.route) throw new Error(`kind "${args.kind}" does not have a public route`);
  const envelope = markdownListingEnvelopeSchema.parse({
    variant: "listing",
    kind: args.kind,
    url: spec.route,
    title: spec.listingTitle,
    description: spec.description,
    count: args.entries.length,
  });
  const body = [
    `# ${spec.listingTitle}`,
    "",
    spec.description,
    "",
    ...args.entries.map((entry) => listingItem(args.kind, entry)),
  ].join("\n");
  return stringifyMarkdown(envelope, ensureTrailingNewline(body));
}

/** Serialize one explicitly listed static page as a Markdown document. */
export function renderStaticMarkdown(args: {
  readonly route: string;
  readonly title: string;
  readonly description: string;
  readonly body: string;
}): string {
  const envelope = markdownStaticEnvelopeSchema.parse({
    variant: "static",
    url: args.route,
    title: args.title,
    description: args.description,
  });
  return stringifyMarkdown(envelope, ensureTrailingNewline(args.body));
}

function staticRecord(page: (typeof STATIC_MARKDOWN_PAGES)[number]): StaticMarkdownRecord {
  return {
    route: page.route,
    markdownSlug: page.markdownSlug,
    markdown: renderStaticMarkdown(page),
  };
}

function listingRecord(bundle: PublicKindBundle): ListingMarkdownRecord {
  const route = KIND_REGISTRY[bundle.kind].route;
  if (!route) throw new Error(`kind "${bundle.kind}" does not have a public route`);
  return {
    kind: bundle.kind,
    route,
    markdownSlug: route.slice(1),
    markdown: renderListingMarkdown(bundle),
  };
}

function detailRecord(
  kind: PublicMarkdownKind,
  entry: MarkdownEntry,
  lookup: EntryLookup,
): DetailMarkdownRecord {
  const route = detailHref(kind, entry.id);
  return {
    kind,
    slug: entry.id,
    route,
    markdownSlug: route.slice(1),
    markdown: renderDetailMarkdown({ kind, entry, lookup }),
  };
}

function stringifyMarkdown(envelope: MarkdownEnvelope, body: string): string {
  const envelopeMarkdown = matter.stringify("", markdownEnvelopeSchema.parse(envelope));
  return envelopeMarkdown.replace(/\n\n$/, "\n") + body;
}

function ensureTrailingNewline(body: string): string {
  return body.endsWith("\n") ? body : `${body}\n`;
}

function listingItem(kind: PublicMarkdownKind, entry: MarkdownEntry): string {
  const spec = KIND_REGISTRY[kind];
  const runtimeSpec = spec as KindRegistryEntry;
  const data = entry.data;
  const title = titleFor(kind, data, entry.id);
  const route = detailHref(kind, entry.id);
  const parts = [`[HTML](${route})`, `[Markdown](${markdownUrlForRoute(route)})`];
  const dateValue = data[spec.dateField];
  if (typeof dateValue === "string") parts.push(formatDate(dateValue));
  if (runtimeSpec.statusField) {
    const status = data[runtimeSpec.statusField];
    if (typeof status === "string") parts.push(status);
  }
  const tags = data["tags"];
  if (Array.isArray(tags) && tags.length > 0) parts.push(tags.map((tag) => `#${tag}`).join(" "));
  return `- **${title}** (${parts.join("; ")})`;
}

async function loadPublicKindBundles(): Promise<PublicKindBundle[]> {
  const bundles = await Promise.all(
    PUBLIC_MARKDOWN_KINDS.map(async (kind) => ({
      kind,
      entries: await getPublicKindCollection(kind),
    })),
  );
  return bundles;
}

async function getPublicKindCollection(
  kind: PublicMarkdownKind,
): Promise<ReadonlyArray<MarkdownEntry>> {
  switch (kind) {
    case "thoughts":
      return getCollection("thoughts") as Promise<ReadonlyArray<MarkdownEntry>>;
    case "claims":
      return getCollection("claims") as Promise<ReadonlyArray<MarkdownEntry>>;
    case "projects":
      return getCollection("projects") as Promise<ReadonlyArray<MarkdownEntry>>;
    case "predictions":
      return getCollection("predictions") as Promise<ReadonlyArray<MarkdownEntry>>;
    case "changed-my-mind":
      return getCollection("changed-my-mind") as Promise<ReadonlyArray<MarkdownEntry>>;
    case "decisions":
      return getCollection("decisions") as Promise<ReadonlyArray<MarkdownEntry>>;
    case "questions":
      return getCollection("questions") as Promise<ReadonlyArray<MarkdownEntry>>;
    case "posts":
      return getCollection("posts") as Promise<ReadonlyArray<MarkdownEntry>>;
    case "inputs":
      return getCollection("inputs") as Promise<ReadonlyArray<MarkdownEntry>>;
  }
}

type EntryLookup = Map<string, { readonly title: string; readonly url: string }>;

function buildEntryLookup(bundles: ReadonlyArray<PublicKindBundle>): EntryLookup {
  const lookup: EntryLookup = new Map();
  for (const bundle of bundles) {
    for (const entry of bundle.entries) {
      const key = `${bundle.kind}/${entry.id}`;
      lookup.set(key, {
        title: titleFor(bundle.kind, entry.data, entry.id),
        url: detailHref(bundle.kind, entry.id),
      });
    }
  }
  return lookup;
}

function resolveLinks(
  kind: PublicMarkdownKind,
  entry: MarkdownEntry,
  lookup: EntryLookup,
): MarkdownDetailEnvelope["links"] {
  const spec = KIND_REGISTRY[kind];
  const links: NonNullable<MarkdownDetailEnvelope["links"]> = {};
  for (const field of Object.keys(spec.linkFields)) {
    const refs = entry.data[field];
    if (!Array.isArray(refs)) continue;
    const resolved = refs
      .filter((ref): ref is string => typeof ref === "string")
      .map((ref) => resolveInternalRef(field, ref, lookup));
    if (resolved.length > 0) links[field] = resolved;
  }
  return Object.keys(links).length > 0 ? links : undefined;
}

function resolveInternalRef(
  field: string,
  rawRef: string,
  lookup: EntryLookup,
): z.infer<typeof detailLinkSchema> {
  const parsed = parseRef(rawRef);
  const candidates =
    parsed.kind !== null
      ? [parsed.kind]
      : (LINK_FIELD_TARGETS[field as keyof typeof LINK_FIELD_TARGETS] ?? PUBLIC_MARKDOWN_KINDS);
  for (const kind of candidates) {
    const key = `${kind}/${parsed.slug}`;
    const target = lookup.get(key);
    if (!target) continue;
    const anchor = parsed.anchor ?? "";
    return {
      status: "resolved",
      ref: rawRef,
      kind,
      slug: parsed.slug,
      title: target.title,
      url: `${target.url}${anchor}`,
    };
  }
  return {
    status: "unresolved",
    ref: rawRef,
    slug: parsed.slug,
    expected_kinds: [...candidates],
  };
}

function parseRef(rawRef: string): {
  readonly kind: PublicMarkdownKind | null;
  readonly slug: string;
  readonly anchor?: string;
} {
  const withoutMd = rawRef.replace(/\.md(#.*)?$/, "$1");
  const [pathPart = "", anchorPart] = withoutMd.replace(/^\/+/, "").split("#", 2);
  const [maybeKind, ...slugParts] = pathPart.split("/");
  const kind = isPublicMarkdownKind(maybeKind) && slugParts.length > 0 ? maybeKind : null;
  const slug = kind ? slugParts.join("/") : pathPart;
  const parsed = { kind, slug: slug.replace(/^\/+/, "") };
  return anchorPart ? { ...parsed, anchor: `#${anchorPart}` } : parsed;
}

function isPublicMarkdownKind(value: string | undefined): value is PublicMarkdownKind {
  return (
    typeof value === "string" && (PUBLIC_MARKDOWN_KINDS as ReadonlyArray<string>).includes(value)
  );
}

function toJsonObject(value: Record<string, unknown>): Record<string, JsonValue> {
  const json = JSON.parse(JSON.stringify(value)) as unknown;
  return jsonObjectSchema.parse(json);
}

function notFoundMarkdownResponse(): Response {
  return new Response("Not found\n", {
    status: 404,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}

function assertUniqueMarkdownSlugs(records: MarkdownRouteRecord[]): MarkdownRouteRecord[] {
  const seen = new Map<string, MarkdownRouteRecord>();
  for (const record of records) {
    const prior = seen.get(record.markdownSlug);
    if (prior) {
      throw new Error(
        `Duplicate Markdown route slug "${record.markdownSlug}" for "${prior.route}" and "${record.route}"`,
      );
    }
    seen.set(record.markdownSlug, record);
  }
  return records;
}
