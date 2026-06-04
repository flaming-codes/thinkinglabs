import type { PostBlock, PostFootnote, PostSection } from "../../frontend/thinkinglabs-ui/types.ts";
import { inlineToHtml, stripHeadingAttributeBlock, stripInlineMarkdown } from "./text.ts";

/** Split a post body into numbered sections of typed blocks (paragraphs, pulls, figures, lists). */
export function buildSections(body: string): PostSection[] {
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
      currentTitle = stripInlineMarkdown(stripHeadingAttributeBlock(match[1] ?? "Section"));
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
