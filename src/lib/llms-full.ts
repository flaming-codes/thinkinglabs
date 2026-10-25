import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { GITHUB_URL, SITE_NAME } from "./site.ts";
import { KIND_REGISTRY, titleFor, type KindRegistryEntry } from "./registry.ts";
import { STATIC_MARKDOWN_PAGES } from "./static-pages.ts";
import { KINDS, type Kind } from "../schemas/index.ts";

//! Derive public kinds dynamically from the single schemas/registry source of truth.
const PUBLIC_FULL_KINDS: ReadonlyArray<Kind> = KINDS.filter(
  (kind) => KIND_REGISTRY[kind].route !== null && kind !== "provenance",
);

/** Generates the full single-file text corpus adhering to the llmstxt.org specification. */
export function generateLlmsFullTxt(repoRoot = process.cwd()): string {
  const contentDir = resolve(repoRoot, "content");
  const lines: string[] = [
    `# ${SITE_NAME} — Full Knowledge Corpus`,
    "",
    `> Personal thinking surface. Markdown source-of-truth at ${GITHUB_URL}.`,
    `> Complete single-turn ingestion document for AI models, coding agents, and contextual assistants.`,
    `> All public claims, thoughts, decisions, projects, predictions, inputs, and observations are included below with full frontmatter metadata and markdown bodies.`,
    "",
    "## Core Surfaces & Static Pages",
    "",
  ];

  for (const page of STATIC_MARKDOWN_PAGES) {
    lines.push(`### ${page.title}`, "");
    lines.push(`- **URL**: ${page.route} (Markdown: /${page.markdownSlug}.md)`);
    lines.push(`- **Description**: ${page.description}`, "");
    lines.push(page.body.trim(), "", "---", "");
  }

  for (const kind of PUBLIC_FULL_KINDS) {
    const spec = KIND_REGISTRY[kind];
    const runtimeSpec = spec as KindRegistryEntry;
    const kindDir = join(contentDir, kind);
    if (!existsSync(kindDir)) continue;

    const files = readdirSync(kindDir)
      .filter((file) => file.endsWith(".md") && !file.startsWith("."))
      .sort();

    if (files.length === 0) continue;

    lines.push(`## ${spec.listingTitle}`, "");
    lines.push(`> ${spec.description}`, "");

    for (const file of files) {
      const slug = file.replace(/\.md$/, "");
      const fullPath = join(kindDir, file);
      const raw = readFileSync(fullPath, "utf8");
      const { data, content } = matter(raw);
      const title = titleFor(kind, data, slug);
      const url = `/${kind}/${slug}`;

      lines.push(`### ${title}`, "");
      lines.push(`- **URL**: ${url} (Markdown: ${url}.md)`);
      lines.push(`- **Source**: content/${kind}/${file}`);

      const metaParts: string[] = [];
      const dateVal = data[spec.dateField];
      if (typeof dateVal === "string") metaParts.push(`Date: ${dateVal}`);
      if (runtimeSpec.statusField && typeof data[runtimeSpec.statusField] === "string") {
        metaParts.push(`Status: ${data[runtimeSpec.statusField]}`);
      }
      if (typeof data["confidence"] === "number") {
        metaParts.push(`Confidence: ${data["confidence"]}`);
      }
      if (Array.isArray(data["tags"]) && data["tags"].length > 0) {
        metaParts.push(`Tags: ${data["tags"].map((t: string) => `#${t}`).join(" ")}`);
      }
      if (metaParts.length > 0) {
        lines.push(`- **Metadata**: ${metaParts.join(" | ")}`);
      }

      for (const field of Object.keys(spec.linkFields)) {
        const refs = data[field];
        if (Array.isArray(refs) && refs.length > 0) {
          lines.push(`- **${field}**: ${refs.join(", ")}`);
        }
      }

      lines.push("");
      const trimmedBody = content.trim();
      if (trimmedBody.length > 0) {
        lines.push(trimmedBody);
      } else {
        lines.push("*(No body content; structured frontmatter-only entry)*");
      }
      lines.push("", "---", "");
    }
  }

  const output = lines.join("\n");
  return output;
}
