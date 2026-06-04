const WORDS_PER_MINUTE = 220;

/** Trim text and append an ellipsis when it exceeds the maximum length. */
export function truncate(text: string, maxLength: number): string {
  const cleaned = text.trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trimEnd()}…`;
}

/** Strip inline and block markdown syntax to recover plain text. */
export function stripInlineMarkdown(text: string): string {
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

/** Escape HTML-sensitive characters in a plain-text string. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Convert inline markdown (links, code, bold, italic) to safe HTML; strips block-level syntax. */
export function inlineToHtml(text: string): string {
  const escaped = escapeHtml(text.replace(/^>\s?/gm, "").replace(/^#{1,6}\s+/gm, ""));
  return escaped
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt: string, src: string) =>
      alt ? `${alt} (${src})` : src,
    )
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_, label: string, href: string) => `<a href="${href}">${label}</a>`,
    )
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>")
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove a trailing Pandoc-style heading attribute block from a heading line. */
export function stripHeadingAttributeBlock(text: string): string {
  return text.replace(/\s+\{[^}]*\}\s*$/, "").trim();
}

/** Split markdown into plain-text paragraphs, dropping headings, footnotes, and code fences. */
export function markdownParagraphs(markdown: string): string[] {
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

/** Count whitespace-delimited words after stripping markdown syntax. */
export function wordCount(text: string): number {
  const normalized = stripInlineMarkdown(text);
  if (normalized.length === 0) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

/** Estimate reading minutes from a word count at a fixed reading rate. */
export function minutesForWords(words: number): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Return the first plain-text paragraph of markdown, or a fallback when none exists. */
export function firstParagraph(markdown: string, fallback: string): string {
  const first = markdownParagraphs(markdown)[0];
  return first ? first : fallback;
}
