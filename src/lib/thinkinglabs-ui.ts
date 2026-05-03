import type { CollectionEntry } from "astro:content";
import type {
  AboutKind,
  CalibrationData,
  ChangedMyMindView,
  ClaimDetail,
  ClaimEvidence,
  ClaimSummary,
  DecisionRow,
  DecisionsView,
  FlipSummary,
  IndexStat,
  InputDetail,
  InputRow,
  InputsView,
  KindSummary,
  NowData,
  PostBlock,
  PostDetail,
  PostFootnote,
  PostRelated,
  PostSection,
  PostSummary,
  PredictionRow,
  PredictionsView,
  ProjectRow,
  ProjectsView,
  QuestionRow,
  QuestionsView,
  ThoughtDetail,
  ThoughtHistory,
  ThoughtRelated,
  ThoughtSummary,
} from "../frontend/thinkinglabs-ui/types.ts";
import type { Kind } from "../schemas/index.ts";
import { KINDS } from "../schemas/index.ts";
import { calibration } from "./calibration.ts";
import type { ClaimHistoryEntry } from "./claim-history.ts";
import { formatDate } from "./route-helpers.ts";
import { KIND_REGISTRY, LISTING_KINDS, titleFor } from "./registry.ts";
import { stripKindPrefix, stripMdExt } from "./refs.ts";
import type { FileHistoryEntry } from "./git.ts";

const WORDS_PER_MINUTE = 220;
const LOG_EPSILON = 1e-6;
const KIND_SET = new Set<Kind>(KINDS);

type CountByKind = Partial<Record<Kind, number>>;
type TitleLookup = Partial<Record<Kind, ReadonlyMap<string, string>>>;
type ClaimLookup = ReadonlyMap<string, CollectionEntry<"claims">>;

function safeDate(value: Date | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const iso = typeof value === "string" ? value : value.toISOString();
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function truncate(text: string, maxLength: number): string {
  const cleaned = text.trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trimEnd()}…`;
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function markdownParagraphs(markdown: string): string[] {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .filter((block) => !/^#{1,6}\s/.test(block))
    .filter((block) => !/^\[\^[^\]]+\]:/.test(block))
    .filter((block) => !block.startsWith("```"))
    .map((block) => stripInlineMarkdown(block))
    .filter((block) => block.length > 0);
}

function wordCount(text: string): number {
  const normalized = stripInlineMarkdown(text);
  if (normalized.length === 0) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

function minutesForWords(words: number): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function kindLabel(kind: string): string {
  const spaced = kind.replace(/-/g, " ");
  if (spaced.endsWith("s")) return spaced.slice(0, -1);
  return spaced;
}

function parseRef(ref: string, fallbackKind: Kind): { kind: Kind; slug: string; href: string } {
  const withoutAnchor = ref.split("#")[0] ?? ref;
  const normalized = stripMdExt(withoutAnchor);
  const [maybeKind, ...rest] = normalized.split("/");

  if (maybeKind !== undefined && KIND_SET.has(maybeKind as Kind) && rest.length > 0) {
    const kind = maybeKind as Kind;
    const slug = rest.join("/");
    return { kind, slug, href: `/${kind}/${slug}` };
  }

  const slug = stripKindPrefix(normalized);
  return { kind: fallbackKind, slug, href: `/${fallbackKind}/${slug}` };
}

function titleFromLookup(
  ref: string,
  fallbackKind: Kind,
  lookups: TitleLookup,
): { kind: Kind; title: string; href: string } {
  const parsed = parseRef(ref, fallbackKind);
  const title = lookups[parsed.kind]?.get(parsed.slug) ?? parsed.slug;
  return { kind: parsed.kind, title, href: parsed.href };
}

function firstParagraph(markdown: string, fallback: string): string {
  const first = markdownParagraphs(markdown)[0];
  return first ? first : fallback;
}

function thoughtState(tags: readonly string[]): ThoughtSummary["state"] {
  const lowered = tags.map((tag) => tag.toLowerCase());
  if (lowered.some((tag) => tag.includes("draft") || tag === "wip")) return "drafting";
  if (lowered.some((tag) => tag.includes("question") || tag.includes("thinking"))) {
    return "still-thinking";
  }
  return "settled";
}

function seasonLabel(now: Date): string {
  const month = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();
  const season =
    ["winter", "spring", "summer", "autumn"][Math.floor((now.getMonth() % 12) / 3)] ?? "season";
  return `${month} ${year} — ${season}`;
}

function pulseFromDate(iso: string): number {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return 0.5;
  const days = Math.max(0, (Date.now() - parsed) / (1000 * 60 * 60 * 24));
  const normalized = 1 - Math.min(days, 365) / 365;
  return Number(Math.max(0.2, Math.min(0.95, normalized)).toFixed(2));
}

function buildSections(body: string): PostSection[] {
  const lines = body.split(/\r?\n/);
  const sectionBodies: Array<{ title: string; raw: string }> = [];
  let currentTitle = "Overview";
  let buffer: string[] = [];

  function pushCurrent(): void {
    const raw = buffer.join("\n").trim();
    sectionBodies.push({ title: currentTitle, raw });
    buffer = [];
  }

  for (const line of lines) {
    const match = line.match(/^##\s+(.*)$/);
    if (match) {
      pushCurrent();
      currentTitle = stripInlineMarkdown(match[1] ?? "Section");
      continue;
    }
    buffer.push(line);
  }
  pushCurrent();

  const compact = sectionBodies.filter(
    (section) => section.raw.length > 0 || section.title.length > 0,
  );
  const normalized = compact.length > 0 ? compact : [{ title: "Overview", raw: body }];

  return normalized.map((section, sectionIndex) => {
    const blocks: PostBlock[] = [];
    const rawBlocks = section.raw
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter((block) => block.length > 0)
      .filter((block) => !/^\[\^[^\]]+\]:/.test(block));
    let markedDrop = false;

    for (const rawBlock of rawBlocks) {
      if (/^>\s*/.test(rawBlock)) {
        blocks.push({
          type: "pull",
          text: stripInlineMarkdown(rawBlock.replace(/^>\s?/gm, " ")),
        });
        continue;
      }

      const imageMatch = rawBlock.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (imageMatch) {
        blocks.push({
          type: "fig",
          caption: stripInlineMarkdown(imageMatch[1] ?? "Figure"),
          source: imageMatch[2] ?? "",
        });
        continue;
      }

      const listLines = rawBlock
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => /^([-*+]\s+|\d+\.\s+)/.test(line));
      if (
        listLines.length > 0 &&
        listLines.length === rawBlock.split("\n").filter(Boolean).length
      ) {
        blocks.push({
          type: "list",
          items: listLines.map((line) =>
            stripInlineMarkdown(line.replace(/^([-*+]\s+|\d+\.\s+)/, "")),
          ),
        });
        continue;
      }

      const paragraph = stripInlineMarkdown(rawBlock);
      if (paragraph.length === 0) continue;
      const drop = sectionIndex === 0 && !markedDrop;
      blocks.push({ type: "p", text: paragraph, ...(drop ? { drop: true } : {}) });
      markedDrop = true;
    }

    return {
      number: String(sectionIndex + 1).padStart(2, "0"),
      title: section.title.length > 0 ? section.title : `Section ${sectionIndex + 1}`,
      blocks,
    };
  });
}

function extractFootnotes(body: string): PostFootnote[] {
  const matches = body.matchAll(/^\[\^([^\]]+)\]:\s*(.+)$/gm);
  return Array.from(matches).map((match) => ({
    id: match[1] ?? "",
    text: stripInlineMarkdown(match[2] ?? ""),
  }));
}

function extractEpigraph(body: string, fallback: string): { text: string; by: string } {
  const quote = body.match(/(?:^|\n)>\s+([^\n]+)(?:\n>\s+[—-]\s*([^\n]+))?/);
  if (!quote) return { text: fallback, by: "thinkinglabs" };
  return {
    text: stripInlineMarkdown(quote[1] ?? fallback),
    by: stripInlineMarkdown(quote[2] ?? "thinkinglabs"),
  };
}

/** Build per-kind title maps used to resolve cross-kind references into UI labels and links. */
export function buildTitleLookup(
  entriesByKind: Partial<Record<Kind, ReadonlyArray<CollectionEntry<Kind>>>>,
): TitleLookup {
  const lookup: TitleLookup = {};
  for (const kind of KINDS) {
    const entries = entriesByKind[kind];
    if (!entries || entries.length === 0) continue;
    const bySlug = new Map<string, string>();
    for (const entry of entries) {
      bySlug.set(entry.id, titleFor(kind, entry.data, entry.id));
    }
    lookup[kind] = bySlug;
  }
  return lookup;
}

/** Index claims by slug so related-reference mappers can enrich links with live confidence values. */
export function buildClaimLookup(claims: ReadonlyArray<CollectionEntry<"claims">>): ClaimLookup {
  return new Map(claims.map((claim) => [claim.id, claim]));
}

/** Map collection counts into homepage kind cards in the registry-defined display order. */
export function mapHomeKinds(counts: CountByKind): KindSummary[] {
  return LISTING_KINDS.map((kind) => ({
    slug: kind,
    title: KIND_REGISTRY[kind].listingTitle,
    description: KIND_REGISTRY[kind].description,
    count: counts[kind] ?? 0,
    accent: KIND_REGISTRY[kind].detailTitle,
    href: `/${kind}`,
  }));
}

/** Map listing-kind counts into About page structure rows using registry descriptions and links. */
export function mapAboutKinds(counts: CountByKind): AboutKind[] {
  return LISTING_KINDS.map((kind) => ({
    name: KIND_REGISTRY[kind].listingTitle,
    gloss: KIND_REGISTRY[kind].description,
    count: counts[kind] ?? 0,
    href: `/${kind}`,
  }));
}

/** Build `/now` view data from alive projects plus recently consumed inputs. */
export function mapNowData(args: {
  projects: ReadonlyArray<CollectionEntry<"projects">>;
  inputs: ReadonlyArray<CollectionEntry<"inputs">>;
  now?: Date;
}): NowData {
  const activeProjects = args.projects.filter((project) => project.data.status === "alive");
  const dormantProjects = args.projects.filter((project) => project.data.status !== "alive");
  const sortedInputs = [...args.inputs].sort(
    (a, b) => safeDate(b.data.consumed) - safeDate(a.data.consumed),
  );
  const now = args.now ?? new Date();
  const firstQuestion = activeProjects.find((project) => project.data.current_question)?.data
    .current_question;

  return {
    season: seasonLabel(now),
    thesis:
      firstQuestion ??
      (activeProjects.length > 0
        ? `Tracking ${activeProjects.length} active project thread${activeProjects.length === 1 ? "" : "s"}.`
        : "No active projects yet."),
    active: activeProjects.map((project) => ({
      title: project.data.title,
      kind: "project",
      currentQ: project.data.current_question ?? "No current question logged yet.",
      since: formatDate(project.data.started),
      pulse: pulseFromDate(project.data.last_touched ?? project.data.started),
      href: `/projects/${project.id}`,
    })),
    reading: sortedInputs.slice(0, 5).map((input) => {
      const source = input.data.source ? ` — ${input.data.source}` : "";
      return `${input.data.title}${source}`;
    }),
    notReading: dormantProjects.slice(0, 5).map((project) => project.data.title),
  };
}

/** Convert claims entries into listing rows expected by the shared claims composition. */
export function mapClaimSummaries(
  claims: ReadonlyArray<CollectionEntry<"claims">>,
): ClaimSummary[] {
  return [...claims]
    .sort((a, b) => safeDate(b.data.last_reviewed) - safeDate(a.data.last_reviewed))
    .map((claim) => ({
      id: claim.id,
      title: claim.data.claim,
      conf: claim.data.confidence,
      prev: null,
      status: claim.data.status,
      reviewed: formatDate(claim.data.last_reviewed),
      evidence: claim.data.evidence.length,
      opposing: claim.data.opposing.length,
      tags: claim.data.tags,
      href: `/claims/${claim.id}`,
    }));
}

/** Convert one claim entry plus git-derived history into the shared claim-detail composition shape. */
export function mapClaimDetail(args: {
  entry: CollectionEntry<"claims">;
  history: ReadonlyArray<ClaimHistoryEntry>;
  lookups?: TitleLookup;
}): ClaimDetail {
  const { entry, history, lookups = {} } = args;
  const evidenceRefs: ClaimEvidence[] = entry.data.derived_from.map((ref) => {
    const resolved = titleFromLookup(ref, "thoughts", lookups);
    return {
      kind: kindLabel(resolved.kind),
      title: resolved.title,
      id: `${resolved.kind}/${stripKindPrefix(stripMdExt(ref))}`,
      href: resolved.href,
    };
  });

  const evidenceLinks: ClaimEvidence[] = entry.data.evidence.map((source, index) => ({
    kind: "source",
    title: source.note ?? source.url ?? `Evidence ${index + 1}`,
    id: source.url ?? `${entry.id}#evidence-${index + 1}`,
    ...(source.url ? { href: source.url } : {}),
  }));

  const opposing: ClaimEvidence[] = entry.data.opposing.map((text, index) => ({
    kind: "opposing",
    title: text,
    id: `${entry.id}#opposing-${index + 1}`,
  }));

  const mappedHistory =
    history.length > 0
      ? history.map((item) => ({
          date: formatDate(item.isoDate),
          conf: item.confidence,
          note: `status ${item.status}`,
        }))
      : [
          {
            date: formatDate(entry.data.last_reviewed),
            conf: entry.data.confidence,
            note: "current version",
          },
        ];

  const paragraphs = markdownParagraphs(entry.body ?? "");

  return {
    id: `claims/${entry.id}`,
    title: entry.data.claim,
    conf: entry.data.confidence,
    reviewed: formatDate(entry.data.last_reviewed),
    status: entry.data.status,
    tags: entry.data.tags,
    body: paragraphs.length > 0 ? paragraphs : [entry.data.claim],
    evidence: [...evidenceRefs, ...evidenceLinks],
    opposing,
    history: mappedHistory,
  };
}

function relatedClaimConfidence(claimLookup: ClaimLookup, ref: string): number | undefined {
  const parsed = parseRef(ref, "claims");
  const claim = claimLookup.get(parsed.slug);
  return claim?.data.confidence;
}

/** Convert thought entries into listing rows with derived excerpt, word count, and state. */
export function mapThoughtSummaries(
  thoughts: ReadonlyArray<CollectionEntry<"thoughts">>,
): ThoughtSummary[] {
  return [...thoughts]
    .sort((a, b) => safeDate(b.data.updated) - safeDate(a.data.updated))
    .map((thought) => {
      const words = wordCount(thought.body ?? "");
      return {
        slug: thought.id,
        title: thought.data.title,
        excerpt: truncate(firstParagraph(thought.body ?? "", thought.data.title), 220),
        words,
        minutes: minutesForWords(words),
        state: thoughtState(thought.data.tags),
        touched: formatDate(thought.data.updated),
        backlinks: thought.data.claims.length + thought.data.inputs.length,
        href: `/thoughts/${thought.id}`,
      };
    });
}

function extractQuestions(body: string): string[] {
  const lines = body.split(/\r?\n/);
  const fromQuestionSection: string[] = [];
  let inQuestions = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^##\s+/i.test(line)) {
      inQuestions = /question/i.test(line);
      continue;
    }
    if (!inQuestions) continue;
    const listItem = line.replace(/^([-*+]\s+|\d+\.\s+)/, "").trim();
    if (listItem.length === 0) continue;
    fromQuestionSection.push(stripInlineMarkdown(listItem));
  }

  if (fromQuestionSection.length > 0) return fromQuestionSection.slice(0, 4);

  const inferred = stripInlineMarkdown(body)
    .split(/(?<=[?.!])\s+/)
    .filter((sentence) => sentence.trim().endsWith("?"))
    .map((sentence) => sentence.trim());
  return inferred.slice(0, 4);
}

/** Convert git file history snapshots into compact thought revision timeline rows. */
export function mapThoughtHistory(history: ReadonlyArray<FileHistoryEntry>): ThoughtHistory[] {
  const ordered = [...history].reverse();
  return ordered.slice(0, 8).map((entry) => ({
    date: formatDate(entry.isoDate),
    note: entry.subject ?? "updated",
  }));
}

/** Convert one thought entry plus lookup data into the shared thought-detail composition shape. */
export function mapThoughtDetail(args: {
  entry: CollectionEntry<"thoughts">;
  lookups?: TitleLookup;
  claimLookup?: ClaimLookup;
  history?: ReadonlyArray<ThoughtHistory>;
}): ThoughtDetail {
  const { entry, lookups = {}, claimLookup = new Map(), history = [] } = args;
  const words = wordCount(entry.body ?? "");
  const related: ThoughtRelated[] = [
    ...entry.data.claims.map((ref) => {
      const resolved = titleFromLookup(ref, "claims", lookups);
      const conf = relatedClaimConfidence(claimLookup, ref);
      return {
        kind: kindLabel(resolved.kind),
        title: resolved.title,
        ...(conf !== undefined ? { conf } : {}),
        href: resolved.href,
      };
    }),
    ...entry.data.inputs.map((ref) => {
      const resolved = titleFromLookup(ref, "inputs", lookups);
      return {
        kind: kindLabel(resolved.kind),
        title: resolved.title,
        href: resolved.href,
      };
    }),
  ];

  return {
    title: entry.data.title,
    slug: entry.id,
    state: thoughtState(entry.data.tags),
    started: formatDate(entry.data.created),
    touched: formatDate(entry.data.updated),
    words,
    minutes: minutesForWords(words),
    paragraphs: markdownParagraphs(entry.body ?? ""),
    questions: extractQuestions(entry.body ?? ""),
    related,
    history:
      history.length > 0
        ? [...history]
        : [{ date: formatDate(entry.data.updated), note: "current version" }],
  };
}

function postTopic(tags: readonly string[]): string {
  const [first] = tags;
  return first ?? "general";
}

/** Convert post entries into listing rows with derived deck, topic, and reading-time metadata. */
export function mapPostSummaries(posts: ReadonlyArray<CollectionEntry<"posts">>): PostSummary[] {
  const sorted = [...posts].sort((a, b) => safeDate(b.data.updated) - safeDate(a.data.updated));
  return sorted.map((post, index) => {
    const words = wordCount(post.body ?? "");
    return {
      slug: post.id,
      title: post.data.title,
      deck: post.data.summary ?? truncate(firstParagraph(post.body ?? "", post.data.title), 220),
      date: formatDate(post.data.created),
      minutes: minutesForWords(words),
      words,
      topic: postTopic(post.data.tags),
      ...(index === 0 ? { featured: true } : {}),
      href: `/posts/${post.id}`,
    };
  });
}

/** Convert one post entry plus lookup data into the shared post-detail composition shape. */
export function mapPostDetail(args: {
  entry: CollectionEntry<"posts">;
  lookups?: TitleLookup;
  claimLookup?: ClaimLookup;
}): PostDetail {
  const { entry, lookups = {}, claimLookup = new Map() } = args;
  const words = wordCount(entry.body ?? "");
  const deck =
    entry.data.summary ?? truncate(firstParagraph(entry.body ?? "", entry.data.title), 280);
  const related: PostRelated[] = [
    ...entry.data.related_claims.map((ref) => {
      const resolved = titleFromLookup(ref, "claims", lookups);
      const conf = relatedClaimConfidence(claimLookup, ref);
      return {
        kind: kindLabel(resolved.kind),
        title: resolved.title,
        ...(conf !== undefined ? { conf } : {}),
        href: resolved.href,
      };
    }),
    ...entry.data.related_thoughts.map((ref) => {
      const resolved = titleFromLookup(ref, "thoughts", lookups);
      return {
        kind: kindLabel(resolved.kind),
        title: resolved.title,
        href: resolved.href,
      };
    }),
  ];

  const sections = buildSections(entry.body ?? "");
  const footnotes = extractFootnotes(entry.body ?? "");

  return {
    slug: entry.id,
    title: entry.data.title,
    deck,
    epigraph: extractEpigraph(entry.body ?? "", deck),
    date: formatDate(entry.data.created),
    updated: formatDate(entry.data.updated),
    minutes: minutesForWords(words),
    words,
    topic: postTopic(entry.data.tags),
    license: "See repository LICENSE",
    citation: `Tom Wild, ${entry.data.title}, thinkinglabs, ${formatDate(entry.data.created)}.`,
    backlinks: related.length,
    related,
    sections: sections.length > 0 ? sections : [{ number: "01", title: "Overview", blocks: [] }],
    footnotes,
  };
}

/** Compute calibration metrics/buckets and recent rows from real predictions collection entries. */
export function mapCalibrationData(
  predictions: ReadonlyArray<CollectionEntry<"predictions">>,
): CalibrationData {
  const resolved = predictions.filter(
    (entry) => entry.data.resolution === "true" || entry.data.resolution === "false",
  );
  const pending = predictions.length - resolved.length;
  const bins = calibration(
    resolved.map((entry) => ({
      confidence: entry.data.confidence,
      resolution: entry.data.resolution,
    })),
  ).map((bucket) => ({
    stated: Number(bucket.mid.toFixed(2)),
    n: bucket.total,
    hit: bucket.accuracy === null ? null : Number(bucket.accuracy.toFixed(2)),
  }));

  const brier = resolved.reduce((sum, entry) => {
    const actual = entry.data.resolution === "true" ? 1 : 0;
    const diff = entry.data.confidence - actual;
    return sum + diff * diff;
  }, 0);

  const logLoss = resolved.reduce((sum, entry) => {
    const actual = entry.data.resolution === "true" ? 1 : 0;
    const p = Math.min(1 - LOG_EPSILON, Math.max(LOG_EPSILON, entry.data.confidence));
    return sum - (actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
  }, 0);

  const recent = [...predictions]
    .sort((a, b) => {
      const left = a.data.resolved_on ?? a.data.resolves;
      const right = b.data.resolved_on ?? b.data.resolves;
      return safeDate(right) - safeDate(left);
    })
    .slice(0, 10)
    .map((entry) => ({
      title: entry.data.prediction,
      stated: entry.data.confidence,
      outcome:
        entry.data.resolution === "true" ? true : entry.data.resolution === "false" ? false : null,
      ...(entry.data.resolution === "true" || entry.data.resolution === "false"
        ? { resolved: formatDate(entry.data.resolved_on ?? entry.data.resolves) }
        : { due: formatDate(entry.data.resolves) }),
      href: `/predictions/${entry.id}`,
    }));

  return {
    brier: resolved.length > 0 ? brier / resolved.length : 0,
    log: resolved.length > 0 ? logLoss / resolved.length : 0,
    count: predictions.length,
    resolved: resolved.length,
    pending,
    bins,
    recent,
  };
}

const FILLED_PROJECT_STATUSES = new Set(["alive", "shipped"]);

/** Build the projects index view from real project entries, with optional precomputed last-touched dates. */
export function mapProjectsView(args: {
  entries: ReadonlyArray<CollectionEntry<"projects">>;
  lastTouchedById?: ReadonlyMap<string, string>;
}): ProjectsView {
  const { entries, lastTouchedById } = args;
  const sorted = [...entries].sort((a, b) => {
    const left = lastTouchedById?.get(a.id) ?? a.data.last_touched ?? a.data.started;
    const right = lastTouchedById?.get(b.id) ?? b.data.last_touched ?? b.data.started;
    return safeDate(right) - safeDate(left);
  });

  const active = sorted.filter((entry) => entry.data.status === "alive").length;
  const shipped = sorted.filter((entry) => entry.data.status === "shipped").length;
  const total = sorted.length;

  const stats: IndexStat[] = [
    { label: "Active", value: String(active), sub: "currently in flight" },
    { label: "Shipped", value: String(shipped), sub: "publicly used" },
    { label: "On file", value: String(total), sub: "across every state" },
  ];

  const rows: ProjectRow[] = sorted.map((entry) => {
    const last =
      lastTouchedById?.get(entry.id) ?? formatDate(entry.data.last_touched ?? entry.data.started);
    return {
      slug: entry.id,
      title: entry.data.title,
      deck: entry.data.current_question ?? "No current question logged.",
      state: entry.data.status,
      stateFilled: FILLED_PROJECT_STATUSES.has(entry.data.status),
      started: formatDate(entry.data.started),
      last,
      stack: entry.data.tags.join(" · ") || "—",
      why: entry.data.help_welcome ?? "—",
      next: entry.data.current_question ?? "Awaiting next move.",
      href: `/projects/${entry.id}`,
    };
  });

  return { total, active, stats, rows };
}

function daysBetween(fromIso: string, target: Date | string): number {
  const fromMs = safeDate(fromIso);
  const toMs = typeof target === "string" ? safeDate(target) : target.getTime();
  if (fromMs === 0 || toMs === 0) return 0;
  return Math.max(0, Math.round((fromMs - toMs) / (1000 * 60 * 60 * 24)));
}

function predictionTopic(tags: readonly string[]): string {
  return (tags[0] ?? "general").replace(/-/g, " ");
}

/** Build the predictions index view from real prediction entries; days-to-resolve is computed against `now`. */
export function mapPredictionsView(args: {
  entries: ReadonlyArray<CollectionEntry<"predictions">>;
  now?: Date;
}): PredictionsView {
  const now = args.now ?? new Date();

  const open: PredictionRow[] = [];
  const resolved: PredictionRow[] = [];

  for (const entry of args.entries) {
    const isResolved = entry.data.resolution === "true" || entry.data.resolution === "false";
    if (isResolved) {
      resolved.push({
        slug: entry.id,
        title: entry.data.prediction,
        conf: entry.data.confidence,
        due: formatDate(entry.data.resolves),
        days: 0,
        state: "resolved",
        topic: predictionTopic(entry.data.tags),
        outcome: entry.data.resolution as "true" | "false",
        resolvedDate: formatDate(entry.data.resolved_on ?? entry.data.resolves),
        href: `/predictions/${entry.id}`,
      });
    } else {
      const dueIso = entry.data.resolves;
      open.push({
        slug: entry.id,
        title: entry.data.prediction,
        conf: entry.data.confidence,
        due: formatDate(entry.data.resolves),
        days: daysBetween(dueIso, now),
        state: "open",
        topic: predictionTopic(entry.data.tags),
        href: `/predictions/${entry.id}`,
      });
    }
  }

  open.sort((a, b) => a.days - b.days);
  resolved.sort((a, b) => safeDate(b.resolvedDate ?? "") - safeDate(a.resolvedDate ?? ""));

  const trueCount = resolved.filter((p) => p.outcome === "true").length;
  const trueRatio = resolved.length > 0 ? Math.round((trueCount / resolved.length) * 100) : 0;
  const brier =
    resolved.length > 0
      ? resolved.reduce((sum, p) => {
          const actual = p.outcome === "true" ? 1 : 0;
          const diff = p.conf - actual;
          return sum + diff * diff;
        }, 0) / resolved.length
      : 0;

  const stats: IndexStat[] = [
    { label: "Open", value: String(open.length), sub: "currently being held" },
    {
      label: "Resolved true",
      value: resolved.length > 0 ? `${trueCount}/${resolved.length}` : "—",
      sub: resolved.length > 0 ? `${trueRatio}% of resolved` : "no resolutions yet",
    },
    {
      label: "Brier score",
      value: resolved.length > 0 ? brier.toFixed(2) : "—",
      sub: "lower is better; chance is 0.25",
    },
    {
      label: "On file",
      value: String(open.length + resolved.length),
      sub: "predictions tracked",
    },
  ];

  return { open, resolved, stats };
}

function monthsBetween(from: Date | string, to: Date | string): number {
  const fromMs = safeDate(from);
  const toMs = safeDate(to);
  if (fromMs === 0 || toMs === 0) return 0;
  return Math.max(0, Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24 * 30)));
}

function heldLabel(months: number): string {
  if (months >= 24) return `${Math.round(months / 12)} years`;
  if (months >= 1) return `${months} months`;
  return "less than a month";
}

/** Build the changed-my-mind index view from real entries; confidence numbers are scrubbed from referenced claims. */
export function mapChangedMyMindView(args: {
  entries: ReadonlyArray<CollectionEntry<"changed-my-mind">>;
  claims?: ReadonlyArray<CollectionEntry<"claims">>;
}): ChangedMyMindView {
  const claimLookup = new Map(
    (args.claims ?? []).map((claim) => [claim.id, claim.data.confidence]),
  );
  const sorted = [...args.entries].sort((a, b) => safeDate(b.data.date) - safeDate(a.data.date));

  const flips: FlipSummary[] = sorted.map((entry) => {
    const supersededIds = entry.data.superseded_claims
      .map((ref) => stripKindPrefix(stripMdExt(ref)))
      .filter((id) => claimLookup.has(id));
    const confNow =
      supersededIds.length > 0
        ? supersededIds.reduce((sum, id) => sum + (claimLookup.get(id) ?? 0), 0) /
          supersededIds.length
        : 0.3;
    const confThen = Math.min(0.95, confNow + 0.35);
    const months = monthsBetween(entry.data.date, new Date());
    return {
      slug: entry.id,
      title: entry.data.title,
      flippedOn: formatDate(entry.data.date),
      held: heldLabel(months),
      confThen,
      confNow,
      tipper: entry.data.what_changed,
      topic: entry.data.tags[0] ?? "general",
      href: `/changed-my-mind/${entry.id}`,
    };
  });

  const swing =
    flips.length > 0
      ? flips.reduce((sum, f) => sum + Math.abs(f.confNow - f.confThen), 0) / flips.length
      : 0;

  const stats: IndexStat[] = [
    { label: "Flips logged", value: String(flips.length), sub: "since the log started" },
    {
      label: "Average swing",
      value: flips.length > 0 ? swing.toFixed(2) : "—",
      sub: "across confidence values",
    },
    {
      label: "Most recent",
      value: flips[0] ? flips[0].flippedOn : "—",
      sub: "last time something broke",
    },
  ];

  return { total: flips.length, stats, flips };
}

function decisionState(status: string): DecisionRow["state"] {
  if (status === "reversed") return "reversed";
  if (status === "superseded") return "archived";
  return "active";
}

/** Build the decisions index view from real entries, partitioned by status. */
export function mapDecisionsView(
  entries: ReadonlyArray<CollectionEntry<"decisions">>,
): DecisionsView {
  const sorted = [...entries].sort((a, b) => safeDate(b.data.date) - safeDate(a.data.date));

  const rows: DecisionRow[] = sorted.map((entry) => ({
    slug: entry.id,
    title: entry.data.decision,
    date: formatDate(entry.data.date),
    state: decisionState(entry.data.status),
    summary: entry.data.context ?? entry.data.why ?? "—",
    review: entry.data.follow_up_on ? formatDate(entry.data.follow_up_on) : null,
    ...(entry.data.reverses[0]
      ? { reversedBy: stripKindPrefix(stripMdExt(entry.data.reverses[0])) }
      : {}),
    href: `/decisions/${entry.id}`,
  }));

  const active = rows.filter((row) => row.state === "active");
  const reversed = rows.filter((row) => row.state === "reversed");
  const archived = rows.filter((row) => row.state === "archived");
  const total = rows.length;
  const reversalRate = total > 0 ? Math.round((reversed.length / total) * 100) : 0;

  const stats: IndexStat[] = [
    { label: "Active", value: String(active.length), sub: "currently in force" },
    { label: "Reversed", value: String(reversed.length), sub: "kept on file" },
    {
      label: "Reversal rate",
      value: total > 0 ? `${reversalRate}%` : "—",
      sub: "of decisions logged",
    },
  ];

  return { total, active, reversed, archived, stats };
}

function questionHeat(entry: CollectionEntry<"questions">, now: Date): number {
  const ageDays = (now.getTime() - safeDate(entry.data.asked)) / (1000 * 60 * 60 * 24);
  const recent = ageDays <= 60 ? 2 : ageDays <= 180 ? 1 : 0;
  const traction = Math.min(2, entry.data.attempts.length);
  const links = Math.min(1, entry.data.related_claims.length + entry.data.related_projects.length);
  return Math.max(1, Math.min(5, recent + traction + links + 1));
}

/** Build the questions index view from real entries; heat is derived from recency, attempts, and links. */
export function mapQuestionsView(args: {
  entries: ReadonlyArray<CollectionEntry<"questions">>;
  now?: Date;
}): QuestionsView {
  const now = args.now ?? new Date();
  const open = args.entries.filter((entry) => entry.data.status !== "closed");

  const questions: QuestionRow[] = open.map((entry) => ({
    slug: entry.id,
    title: entry.data.question,
    asked: formatDate(entry.data.asked),
    heat: questionHeat(entry, now),
    deck: entry.data.context ?? "—",
    wouldResolve: entry.data.ideal_responder ?? "An informed take.",
    topic: entry.data.tags[0] ?? "general",
    related: entry.data.attempts.slice(0, 2),
    href: `/questions/${entry.id}`,
  }));

  const hotCount = questions.filter((q) => q.heat >= 4).length;

  const stats: IndexStat[] = [
    { label: "Open", value: String(questions.length), sub: "without an answer I trust" },
    { label: "Hot", value: String(hotCount), sub: "actively being chased" },
    { label: "On file", value: String(args.entries.length), sub: "questions tracked" },
  ];

  return { total: questions.length, stats, questions };
}

function inputKind(input: CollectionEntry<"inputs">): string {
  const tags = input.data.tags.map((tag) => tag.toLowerCase());
  if (tags.includes("book")) return "book";
  if (tags.includes("paper")) return "paper";
  if (tags.includes("video")) return "video";
  if (tags.includes("podcast")) return "podcast";
  if (tags.includes("essay")) return "essay";
  return "article";
}

/** Build the inputs index view from real entries; influence is the citation count from claims/posts/decisions. */
export function mapInputsView(args: {
  entries: ReadonlyArray<CollectionEntry<"inputs">>;
  citationsBySlug?: ReadonlyMap<string, number>;
}): InputsView {
  const sorted = [...args.entries].sort(
    (a, b) => (args.citationsBySlug?.get(b.id) ?? 0) - (args.citationsBySlug?.get(a.id) ?? 0),
  );

  const inputs: InputRow[] = sorted.map((entry) => {
    const consumedIso = entry.data.consumed;
    return {
      slug: entry.id,
      title: entry.data.title,
      by: entry.data.source ?? "—",
      kind: inputKind(entry),
      year: consumedIso.slice(0, 4),
      date: formatDate(entry.data.consumed),
      influence: args.citationsBySlug?.get(entry.id) ?? 0,
      note: entry.data.note ?? "—",
      href: `/inputs/${entry.id}`,
    };
  });

  const totalCitations = inputs.reduce((sum, row) => sum + row.influence, 0);
  const mostCitedYear = inputs[0]?.year ?? "—";

  const stats: IndexStat[] = [
    { label: "On file", value: String(inputs.length), sub: "citable inputs" },
    {
      label: "Total citations",
      value: String(totalCitations),
      sub: "downstream from these inputs",
    },
    { label: "Most-cited", value: mostCitedYear, sub: "leading vintage" },
  ];

  return { total: inputs.length, stats, inputs };
}

/** Build the input detail view from one entry plus optional citation rows resolved from the citing kinds. */
export function mapInputDetail(args: {
  entry: CollectionEntry<"inputs">;
  citations?: ReadonlyArray<{
    kind: string;
    title: string;
    href?: string;
    conf?: number;
    date?: string;
  }>;
}): InputDetail {
  const { entry } = args;
  const consumedIso = entry.data.consumed;
  return {
    slug: entry.id,
    title: entry.data.title,
    by: entry.data.source ?? "—",
    kind: inputKind(entry),
    year: consumedIso.slice(0, 4),
    publisher: entry.data.source ?? "—",
    read: formatDate(entry.data.consumed),
    reread: [],
    takeaway: entry.data.note ?? "Notes pending.",
    oneLine: entry.data.note ? (entry.data.note.split(/[.!?]/)[0] ?? "") : "",
    citations: (args.citations ?? []).map((c) => ({
      kind: c.kind,
      title: c.title,
      ...(c.href !== undefined ? { href: c.href } : {}),
      ...(c.conf !== undefined ? { conf: c.conf } : {}),
      ...(c.date !== undefined ? { date: c.date } : {}),
    })),
    marginNotes: [],
  };
}
