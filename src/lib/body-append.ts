import { readFileSync, writeFileSync } from "node:fs";
import matter from "gray-matter";

/** Appends a markdown section with the given heading and body to a frontmatter-bearing file; preserves existing content. */
export function appendSection(filePath: string, heading: string, sectionBody: string): void {
  const raw = readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const existing = parsed.content.trimEnd();
  const separator = existing.length > 0 ? "\n\n" : "\n";
  const next = `${existing}${separator}## ${heading}\n${sectionBody}\n`;
  writeFileSync(filePath, matter.stringify(next, parsed.data), "utf8");
}

/** Rewrites the `last_verified` attribute on the given heading to `newDateISO`; preserves frontmatter and other content. */
export function restampSectionVerified(
  filePath: string,
  headingText: string,
  newDateISO: string,
): void {
  const raw = readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const lines = parsed.content.split("\n");
  const headingRe = /^#{1,6}\s+/;
  const newDate = newDateISO.slice(0, 10);
  for (let i = 0; i < lines.length; i++) {
    if (!headingRe.test(lines[i]!)) continue;
    const text = lines[i]!.replace(/\s*\{[^{}]*\}\s*$/, "")
      .replace(/^#{1,6}\s+/, "")
      .trim();
    if (text !== headingText) continue;
    lines[i] = lines[i]!.replace(
      /last_verified\s*=\s*["“][^"”]*["”]/,
      `last_verified="${newDate}"`,
    );
    break;
  }
  writeFileSync(filePath, matter.stringify(lines.join("\n"), parsed.data), "utf8");
}

/** Inserts a "Deprecated" callout immediately after the given heading; idempotent on repeated calls (no double-insertion). */
export function deprecateSectionCallout(filePath: string, headingText: string): void {
  const raw = readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const lines = parsed.content.split("\n");
  const headingRe = /^#{1,6}\s+/;
  const callout = "> **Deprecated.** This section may no longer be accurate. Review pending.";
  for (let i = 0; i < lines.length; i++) {
    if (!headingRe.test(lines[i]!)) continue;
    const text = lines[i]!.replace(/\s*\{[^{}]*\}\s*$/, "")
      .replace(/^#{1,6}\s+/, "")
      .trim();
    if (text !== headingText) continue;
    let probe = i + 1;
    while (probe < lines.length && lines[probe] === "") probe++;
    if (probe < lines.length && lines[probe] === callout) return;
    lines.splice(i + 1, 0, "", callout, "");
    break;
  }
  writeFileSync(filePath, matter.stringify(lines.join("\n"), parsed.data), "utf8");
}
