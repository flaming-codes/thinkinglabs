import type {
  BlogPosting,
  BreadcrumbList,
  Claim as SchemaClaim,
  CreativeWork,
  DigitalDocument,
  Graph,
  IdReference,
  ItemList,
  ListItem,
  Person,
  Project as SchemaProject,
  Question as SchemaQuestion,
  Statement,
  Thing,
  WebPage,
  WebSite,
} from "schema-dts";
import type { ChangedMyMind } from "../schemas/changed-my-mind.ts";
import type { Claim } from "../schemas/claim.ts";
import type { Decision } from "../schemas/decision.ts";
import type { Input } from "../schemas/input.ts";
import type { Post } from "../schemas/post.ts";
import type { Prediction } from "../schemas/prediction.ts";
import type { Project } from "../schemas/project.ts";
import type { Question } from "../schemas/question.ts";
import type { Thought } from "../schemas/thought.ts";
import { SITE_NAME } from "./site.ts";

/** Page-specific Schema.org nodes passed from routes into the shared page graph builder. */
export interface StructuredData {
  readonly mainEntityId?: string;
  readonly nodes: readonly Thing[];
}

interface PageGraphOptions {
  readonly site: string | URL;
  readonly url: string | URL;
  readonly title: string;
  readonly description?: string | undefined;
  readonly structuredData?: StructuredData | undefined;
}

interface DetailEntry<T> {
  readonly id: string;
  readonly data: T;
}

const AUTHOR_NAME = "Tom";
const LANGUAGE = "en";

/** Normalizes local paths and absolute URLs into fragment-free canonical site URLs. */
export function canonicalUrl(pathOrUrl: string | URL, site: string | URL): string {
  const url = new URL(pathOrUrl.toString(), site);
  url.hash = "";
  url.search = "";
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/$/, "");
  return url.href;
}

/** Builds the default JSON-LD graph for a rendered HTML page, with optional route-specific nodes. */
export function buildPageGraph(options: PageGraphOptions): Graph {
  const url = canonicalUrl(options.url, options.site);
  const site = canonicalUrl("/", options.site);
  const page: WebPage = {
    "@type": "WebPage",
    "@id": pageId(url),
    url,
    name: options.title,
    inLanguage: LANGUAGE,
    isPartOf: ref(websiteId(site)),
    author: ref(personId(site)),
  };
  addDefined(page, "description", options.description);
  if (options.structuredData?.mainEntityId)
    page.mainEntity = ref(options.structuredData.mainEntityId);

  return prune({
    "@context": "https://schema.org",
    "@graph": [websiteNode(site), personNode(site), page, ...(options.structuredData?.nodes ?? [])],
  }) satisfies Graph;
}

/** Builds a Schema.org breadcrumb list for a detail page. */
export function breadcrumbFor(
  currentUrl: string | URL,
  site: string | URL,
  items: ReadonlyArray<{ readonly name: string; readonly url: string }>,
): BreadcrumbList {
  const canonical = canonicalUrl(currentUrl, site);
  const itemListElement = items.map((item, index) => {
    return {
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.url, site),
    } satisfies ListItem;
  });
  return {
    "@type": "BreadcrumbList",
    "@id": `${canonical}#breadcrumb`,
    itemListElement,
  } satisfies BreadcrumbList;
}

/** Builds a Schema.org item list for listing pages and pages that summarize collections. */
export function listStructuredData(
  currentUrl: string | URL,
  site: string | URL,
  title: string,
  entries: ReadonlyArray<{ readonly id: string; readonly name: string; readonly url: string }>,
): StructuredData {
  const url = canonicalUrl(currentUrl, site);
  const id = `${url}#items`;
  const itemListElement = entries.map((entry, index) => {
    return {
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: canonicalUrl(entry.url, site),
    } satisfies ListItem;
  });
  const node = prune({
    "@type": "ItemList",
    "@id": id,
    name: title,
    numberOfItems: entries.length,
    itemListElement,
  }) satisfies ItemList;
  return { mainEntityId: id, nodes: [node] };
}

/** Builds BlogPosting metadata for a post detail page. */
export function postStructuredData(
  entry: DetailEntry<Post>,
  currentUrl: string | URL,
  site: string | URL,
): StructuredData {
  const url = canonicalUrl(currentUrl, site);
  const id = `${url}#post`;
  const node: BlogPosting = {
    "@type": "BlogPosting",
    "@id": id,
    url,
    mainEntityOfPage: ref(pageId(url)),
    isPartOf: ref(websiteId(site)),
    author: ref(personId(site)),
    headline: entry.data.title,
    name: entry.data.title,
    datePublished: entry.data.created,
    dateModified: entry.data.updated,
    keywords: entry.data.tags,
    inLanguage: LANGUAGE,
  };
  addDefined(node, "description", entry.data.summary);
  return detailStructuredData(
    id,
    prune(node),
    currentUrl,
    site,
    "Posts",
    "/posts",
    entry.data.title,
  );
}

/** Builds CreativeWork metadata for a thought detail page. */
export function thoughtStructuredData(
  entry: DetailEntry<Thought>,
  currentUrl: string | URL,
  site: string | URL,
): StructuredData {
  const url = canonicalUrl(currentUrl, site);
  const id = `${url}#thought`;
  const node = creativeWorkNode({
    id,
    url,
    type: "CreativeWork",
    name: entry.data.title,
    dateCreated: entry.data.created,
    dateModified: entry.data.updated,
    keywords: entry.data.tags,
  });
  return detailStructuredData(
    id,
    prune(node),
    currentUrl,
    site,
    "Thoughts",
    "/thoughts",
    entry.data.title,
  );
}

/** Builds Claim metadata without implying a third-party fact-check ClaimReview. */
export function claimStructuredData(
  entry: DetailEntry<Claim>,
  currentUrl: string | URL,
  site: string | URL,
): StructuredData {
  const url = canonicalUrl(currentUrl, site);
  const id = `${url}#claim`;
  const evidence = entry.data.evidence
    .map((e) => e.url ?? e.note)
    .filter((value): value is string => Boolean(value));
  const node: SchemaClaim = {
    "@type": "Claim",
    "@id": id,
    url,
    mainEntityOfPage: ref(pageId(url)),
    author: ref(personId(site)),
    name: entry.data.claim,
    text: entry.data.claim,
    dateModified: entry.data.last_reviewed,
    creativeWorkStatus: entry.data.status,
    citation: evidence,
    keywords: entry.data.tags,
    inLanguage: LANGUAGE,
  };
  return detailStructuredData(
    id,
    prune(node),
    currentUrl,
    site,
    "Claims",
    "/claims",
    entry.data.claim,
  );
}

/** Builds Project metadata for a project detail page using Schema.org's Organization-derived Project type. */
export function projectStructuredData(
  entry: DetailEntry<Project>,
  currentUrl: string | URL,
  site: string | URL,
  lastTouched?: string,
): StructuredData {
  const url = canonicalUrl(currentUrl, site);
  const id = `${url}#project`;
  const node: Exclude<SchemaProject, string> = {
    "@type": "Project",
    "@id": id,
    url,
    mainEntityOfPage: ref(pageId(url)),
    name: entry.data.title,
    foundingDate: entry.data.started,
    keywords: entry.data.tags,
  };
  addDefined(
    node,
    "description",
    entry.data.current_question ?? entry.data.help_welcome ?? entry.data.status,
  );
  addDefined(node, "sameAs", entry.data.links.repo);
  void lastTouched;
  return detailStructuredData(
    id,
    prune(node),
    currentUrl,
    site,
    "Projects",
    "/projects",
    entry.data.title,
  );
}

/** Builds Statement metadata for a falsifiable prediction detail page. */
export function predictionStructuredData(
  entry: DetailEntry<Prediction>,
  currentUrl: string | URL,
  site: string | URL,
): StructuredData {
  const url = canonicalUrl(currentUrl, site);
  const id = `${url}#prediction`;
  const node = prune({
    "@type": "Statement",
    "@id": id,
    url,
    mainEntityOfPage: ref(pageId(url)),
    author: ref(personId(site)),
    name: entry.data.prediction,
    text: entry.data.prediction,
    dateCreated: entry.data.made,
    expires: entry.data.resolves,
    creativeWorkStatus: entry.data.resolution,
    keywords: entry.data.tags,
    inLanguage: LANGUAGE,
  }) satisfies Statement;
  return detailStructuredData(
    id,
    prune(node),
    currentUrl,
    site,
    "Predictions",
    "/predictions",
    entry.data.prediction,
  );
}

/** Builds CreativeWork metadata for a belief-revision detail page. */
export function changedMyMindStructuredData(
  entry: DetailEntry<ChangedMyMind>,
  currentUrl: string | URL,
  site: string | URL,
): StructuredData {
  const url = canonicalUrl(currentUrl, site);
  const id = `${url}#belief-revision`;
  const node = creativeWorkNode({
    id,
    url,
    type: "CreativeWork",
    name: entry.data.title,
    dateCreated: entry.data.date,
    text: `${entry.data.used_to_believe} ${entry.data.what_changed} ${entry.data.now_believe}`,
    keywords: entry.data.tags,
  });
  return detailStructuredData(
    id,
    prune(node),
    currentUrl,
    site,
    "Changed my mind",
    "/changed-my-mind",
    entry.data.title,
  );
}

/** Builds CreativeWork metadata for a decision detail page. */
export function decisionStructuredData(
  entry: DetailEntry<Decision>,
  currentUrl: string | URL,
  site: string | URL,
): StructuredData {
  const url = canonicalUrl(currentUrl, site);
  const id = `${url}#decision`;
  const node = creativeWorkNode({
    id,
    url,
    type: "CreativeWork",
    name: entry.data.decision,
    dateCreated: entry.data.date,
    text: entry.data.why ?? entry.data.context ?? undefined,
    creativeWorkStatus: entry.data.status,
    keywords: entry.data.tags,
  });
  return detailStructuredData(
    id,
    prune(node),
    currentUrl,
    site,
    "Decisions",
    "/decisions",
    entry.data.decision,
  );
}

/** Builds Question metadata for an open-question detail page without implying rendered answers. */
export function questionStructuredData(
  entry: DetailEntry<Question>,
  currentUrl: string | URL,
  site: string | URL,
): StructuredData {
  const url = canonicalUrl(currentUrl, site);
  const id = `${url}#question`;
  const node = prune({
    "@type": "Question",
    "@id": id,
    url,
    mainEntityOfPage: ref(pageId(url)),
    author: ref(personId(site)),
    name: entry.data.question,
    text: entry.data.question,
    dateCreated: entry.data.asked,
    creativeWorkStatus: entry.data.status,
    keywords: entry.data.tags,
    inLanguage: LANGUAGE,
  }) satisfies SchemaQuestion;
  return detailStructuredData(
    id,
    prune(node),
    currentUrl,
    site,
    "Questions",
    "/questions",
    entry.data.question,
  );
}

/** Builds DigitalDocument metadata for an input detail page and links out to the original material when present. */
export function inputStructuredData(
  entry: DetailEntry<Input>,
  currentUrl: string | URL,
  site: string | URL,
): StructuredData {
  const url = canonicalUrl(currentUrl, site);
  const id = `${url}#input`;
  const node: DigitalDocument = {
    "@type": "DigitalDocument",
    "@id": id,
    url,
    mainEntityOfPage: ref(pageId(url)),
    name: entry.data.title,
    keywords: entry.data.tags,
    inLanguage: LANGUAGE,
  };
  addDefined(node, "author", entry.data.source);
  addDefined(node, "sameAs", entry.data.url);
  addDefined(node, "description", entry.data.note);
  return detailStructuredData(
    id,
    prune(node),
    currentUrl,
    site,
    "Inputs",
    "/inputs",
    entry.data.title,
  );
}

function detailStructuredData(
  mainEntityId: string,
  node: Thing,
  currentUrl: string | URL,
  site: string | URL,
  collectionName: string,
  collectionUrl: string,
  currentName: string,
): StructuredData {
  return {
    mainEntityId,
    nodes: [
      breadcrumbFor(currentUrl, site, [
        { name: "Home", url: "/" },
        { name: collectionName, url: collectionUrl },
        { name: currentName, url: new URL(currentUrl.toString(), site).pathname },
      ]),
      node,
    ],
  };
}

function creativeWorkNode(options: {
  readonly id: string;
  readonly url: string;
  readonly type: "CreativeWork";
  readonly name: string;
  readonly dateCreated?: string | undefined;
  readonly dateModified?: string | undefined;
  readonly text?: string | undefined;
  readonly creativeWorkStatus?: string | undefined;
  readonly keywords?: readonly string[] | undefined;
}): CreativeWork {
  const node: CreativeWork = {
    "@type": options.type,
    "@id": options.id,
    url: options.url,
    mainEntityOfPage: ref(pageId(options.url)),
    author: ref(personId(options.url)),
    name: options.name,
    inLanguage: LANGUAGE,
  };
  addDefined(node, "dateCreated", options.dateCreated);
  addDefined(node, "dateModified", options.dateModified);
  addDefined(node, "text", options.text);
  addDefined(node, "creativeWorkStatus", options.creativeWorkStatus);
  addDefined(node, "keywords", options.keywords);
  return prune(node);
}

function websiteNode(site: string): WebSite {
  return {
    "@type": "WebSite",
    "@id": websiteId(site),
    url: site,
    name: SITE_NAME,
    inLanguage: LANGUAGE,
    author: ref(personId(site)),
    publisher: ref(personId(site)),
  } satisfies WebSite;
}

function personNode(site: string): Person {
  return {
    "@type": "Person",
    "@id": personId(site),
    name: AUTHOR_NAME,
    url: canonicalUrl("/about", site),
  } satisfies Person;
}

function addDefined<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (!isEmpty(value)) target[key] = value as T[K];
}

function websiteId(site: string | URL): string {
  return `${canonicalUrl("/", site)}#website`;
}

function personId(site: string | URL): string {
  return `${canonicalUrl("/", site)}#person`;
}

function pageId(url: string): string {
  return `${canonicalUrl(url, url)}#webpage`;
}

function ref(id: string): IdReference {
  return { "@id": id };
}

function prune<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => prune(item)).filter((item) => !isEmpty(item)) as T;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, prune(item)] as const)
      .filter(([, item]) => !isEmpty(item));
    return Object.fromEntries(entries) as T;
  }
  return value;
}

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && value !== null && Object.keys(value).length === 0)
  );
}
