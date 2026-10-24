import type {
  PostBlock,
  PostFootnote,
  PostSection as BasePostSection,
} from "../../frontend/thinkinglabs-ui/types.ts";
import { nowISO } from "../clock.ts";
import { FRESHNESS_THRESHOLDS, freshnessNowISO, freshnessState } from "../freshness.ts";
import { inlineToHtml, stripHeadingAttributeBlock, stripInlineMarkdown } from "./text.ts";

/** Visual freshness state for a rendered post section heading pill. */
export type SectionFreshnessState = "fresh" | "aging" | "stale";

/** Extended post section with optional heading anchor ID and per-section freshness metadata. */
export type PostSection = BasePostSection & {
  id?: string;
  lastVerified?: string;
  freshnessState?: SectionFreshnessState;
};

function parseHeadingAttributes(rawHeading: string): {
  id?: string;
  lastVerified?: string;
} {
  const attrMatch = rawHeading.match(/\{([^}]*)\}\s*$/);
  if (!attrMatch) return {};
  const attrContent = attrMatch[1] ?? "";
  const idMatch = attrContent.match(/(?:^|\s)#([A-Za-z0-9_.:-]+)(?=\s|$)/);
  const verifiedMatch = attrContent.match(
    /(?:^|\s)last_verified=(?:"([^"]+)"|'([^']+)'|([^\s}]+))/,
  );
  const id = idMatch?.[1];
  const lastVerified = verifiedMatch?.[1] ?? verifiedMatch?.[2] ?? verifiedMatch?.[3];
  return {
    ...(id !== undefined && id.length > 0 ? { id } : {}),
    ...(lastVerified !== undefined && lastVerified.length > 0 ? { lastVerified } : {}),
  };
}

function resolveSectionFreshnessState(
  lastVerified: string,
  referenceNowISO: string,
): SectionFreshnessState {
  const { daysAgo } = freshnessState(lastVerified, referenceNowISO);
  if (daysAgo < FRESHNESS_THRESHOLDS.greenMaxDays) return "fresh";
  if (daysAgo <= FRESHNESS_THRESHOLDS.amberMaxDays) return "aging";
  return "stale";
}

/** Split a post body into numbered sections of typed blocks (paragraphs, pulls, figures, lists). */
export function buildSections(body: string, referenceNowISO?: string): PostSection[] {
  const effectiveNowISO =
    referenceNowISO ??
    (process.env["FRESHNESS_NOW_ISO"] !== undefined ? freshnessNowISO() : nowISO());
  const lines = body.split(/\r?\n/);
  const sectionBodies: Array<{
    title: string;
    raw: string;
    id?: string;
    lastVerified?: string;
  }> = [];
  let currentTitle = "Overview";
  let currentId: string | undefined;
  let currentLastVerified: string | undefined;
  let hasExplicitHeading = false;
  let buffer: string[] = [];

  function pushCurrent(): void {
    const raw = buffer.join("\n").trim();
    if (!hasExplicitHeading && raw.length === 0) {
      buffer = [];
      return;
    }
    sectionBodies.push({
      title: currentTitle,
      raw,
      ...(currentId !== undefined ? { id: currentId } : {}),
      ...(currentLastVerified !== undefined ? { lastVerified: currentLastVerified } : {}),
    });
    buffer = [];
  }

  for (const line of lines) {
    const match = line.match(/^##\s+(.*)$/);
    if (match) {
      pushCurrent();
      const rawHeading = match[1] ?? "Section";
      const attrs = parseHeadingAttributes(rawHeading);
      currentTitle = stripInlineMarkdown(stripHeadingAttributeBlock(rawHeading));
      currentId = attrs.id;
      currentLastVerified = attrs.lastVerified;
      hasExplicitHeading = true;
      continue;
    }
    buffer.push(line);
  }
  pushCurrent();

  const compact = sectionBodies.filter(
    (section) => section.raw.length > 0 || section.title.length > 0,
  );
  const normalized: Array<{
    title: string;
    raw: string;
    id?: string;
    lastVerified?: string;
  }> = compact.length > 0 ? compact : [{ title: "Overview", raw: body }];

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
        const stripped = rawBlock.replace(/^>\s?/gm, " ");
        blocks.push({
          type: "pull",
          text: stripInlineMarkdown(stripped),
          html: inlineToHtml(stripped),
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
        const stripped = listLines.map((line) => line.replace(/^([-*+]\s+|\d+\.\s+)/, ""));
        blocks.push({
          type: "list",
          items: stripped.map((line) => stripInlineMarkdown(line)),
          itemsHtml: stripped.map((line) => inlineToHtml(line)),
        });
        continue;
      }

      const paragraph = stripInlineMarkdown(rawBlock);
      if (paragraph.length === 0) continue;
      const drop = sectionIndex === 0 && !markedDrop;
      blocks.push({
        type: "p",
        text: paragraph,
        html: inlineToHtml(rawBlock),
        ...(drop ? { drop: true } : {}),
      });
      markedDrop = true;
    }

    return {
      number: String(sectionIndex + 1).padStart(2, "0"),
      title: section.title.length > 0 ? section.title : `Section ${sectionIndex + 1}`,
      ...(section.id !== undefined ? { id: section.id } : {}),
      ...(section.lastVerified !== undefined
        ? {
            lastVerified: section.lastVerified,
            freshnessState: resolveSectionFreshnessState(section.lastVerified, effectiveNowISO),
          }
        : {}),
      blocks,
    };
  });
}

/** Extract footnote definitions from a post body into id/text/html triples. */
export function extractFootnotes(body: string): PostFootnote[] {
  const matches = body.matchAll(/^\[\^([^\]]+)\]:\s*(.+)$/gm);
  return Array.from(matches).map((match) => ({
    id: match[1] ?? "",
    text: stripInlineMarkdown(match[2] ?? ""),
    html: inlineToHtml(match[2] ?? ""),
  }));
}

/** Extract the leading blockquote epigraph from a post body, falling back to supplied defaults. */
export function extractEpigraph(body: string, fallback: string): { text: string; by: string } {
  const quote = body.match(/(?:^|\n)>\s+([^\n]+)(?:\n>\s+[—-]\s*([^\n]+))?/);
  if (!quote) return { text: fallback, by: "thinkinglabs" };
  return {
    text: stripInlineMarkdown(quote[1] ?? fallback),
    by: stripInlineMarkdown(quote[2] ?? "thinkinglabs"),
  };
}
