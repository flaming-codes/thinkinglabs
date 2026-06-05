import type { Kind } from "../schemas/index.ts";
import { detailHref } from "./entity-routes.ts";
import { GITHUB_URL } from "./site.ts";

const APPROX_CHARS_PER_TOKEN = 4;

/** Machine-facing metadata derived from canonical source, never hand-authored in frontmatter. */
export interface AgentContentMetadata {
  readonly source_path: string;
  readonly html_url: string;
  readonly markdown_url: string;
  readonly source_url: string;
  readonly summary: string;
  readonly word_count: number;
  readonly approx_token_count: number;
  readonly token_estimate: "chars/4";
}

/** Convert a canonical public HTML route into its Markdown sibling URL. */
export function markdownUrlForRoute(route: string): string {
  if (route === "/") return "/index.md";
  return `${route.replace(/\/$/, "")}.md`;
}

/** Rough, model-independent token estimate using the common characters / 4 rule. */
export function estimateTokenCount(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return Math.max(1, Math.ceil(trimmed.length / APPROX_CHARS_PER_TOKEN));
}

/** Count words after removing the highest-noise markdown syntax. */
export function wordCount(text: string): number {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_~`|:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length === 0 ? 0 : cleaned.split(" ").length;
}

/** First useful paragraph, flattened and capped for agent list views. */
export function summarizeMarkdown(body: string, limit = 240): string {
  const paragraph =
    body
      .split(/\n\s*\n/)
      .find((p) => p.trim().length > 0)
      ?.replace(/\s+/g, " ")
      .trim() ?? "";
  return paragraph.length > limit ? `${paragraph.slice(0, Math.max(0, limit - 3))}...` : paragraph;
}

/** First useful scalar frontmatter value for objects whose meaning lives mostly in YAML. */
function summarizeFrontmatter(frontmatter: Record<string, unknown> | undefined): string {
  if (!frontmatter) return "";
  for (const key of [
    "summary",
    "note",
    "claim",
    "prediction",
    "decision",
    "question",
    "observation",
    "title",
  ]) {
    const value = frontmatter[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
}

/** Return the canonical repository-relative markdown source path for one content object. */
export function contentSourcePath(kind: Kind, slug: string): string {
  return `content/${kind}/${slug}.md`;
}

/** Convert a repository-relative source path into a public GitHub blob URL. */
export function sourceUrlForPath(sourcePath: string): string {
  return `${GITHUB_URL}/blob/main/${sourcePath}`;
}

/** Build the derived metadata bundle for one public content object. */
export function agentMetadataForContent(args: {
  readonly kind: Kind;
  readonly slug: string;
  readonly body: string;
  readonly frontmatter?: Record<string, unknown> | undefined;
  readonly markdown?: string | undefined;
}): AgentContentMetadata {
  const htmlUrl = detailHref(args.kind, args.slug);
  const sourcePath = contentSourcePath(args.kind, args.slug);
  const fallbackBasis = [JSON.stringify(args.frontmatter ?? {}), args.body].join("\n\n").trim();
  const tokenBasis = args.markdown ?? fallbackBasis;
  const summary = summarizeMarkdown(args.body) || summarizeFrontmatter(args.frontmatter);
  return {
    source_path: sourcePath,
    html_url: htmlUrl,
    markdown_url: markdownUrlForRoute(htmlUrl),
    source_url: sourceUrlForPath(sourcePath),
    summary,
    word_count: wordCount(tokenBasis),
    approx_token_count: estimateTokenCount(tokenBasis),
    token_estimate: "chars/4",
  };
}
