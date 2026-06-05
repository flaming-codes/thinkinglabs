#!/usr/bin/env tsx
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { markdownUrlForRoute } from "../src/lib/agent-metadata.ts";
import { loadContact } from "../src/lib/contact.ts";
import { SECTION_ORDER, SECTION_TITLES, SURFACES } from "../src/lib/surfaces.ts";
import { GITHUB_URL, SITE_NAME } from "../src/lib/site.ts";

/** Generates `public/llms.txt` from the shared surfaces inventory; runs as a `prebuild` step so the file exists before astro copies `public/`. */
function main(): void {
  loadContact();
  const sections = new Map<string, (typeof SURFACES)[number][]>();
  const publicDir = resolve(process.cwd(), "public");
  for (const s of SURFACES) {
    if (s.optionalPublicFile && !existsSync(resolve(publicDir, s.optionalPublicFile))) continue;
    const list = sections.get(s.section) ?? [];
    list.push(s);
    sections.set(s.section, list);
  }
  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    `> Personal thinking surface. Markdown source-of-truth at ${GITHUB_URL}. Every page below renders from \`content/<kind>/\`.`,
    `> Token counts use the approximate \`chars/4\` estimate. Detail Markdown and JSON payloads expose \`agent_metadata.approx_token_count\`.`,
    "",
  ];
  for (const key of SECTION_ORDER) {
    const items = sections.get(key);
    if (!items || items.length === 0) continue;
    lines.push(`## ${SECTION_TITLES[key]}`, "");
    for (const s of items) lines.push(`- [${s.title}](${s.url}): ${surfaceDescription(s)}`);
    lines.push("");
  }
  const out = resolve(process.cwd(), "public/llms.txt");
  writeFileSync(out, lines.join("\n"));
  process.stdout.write(`wrote ${out}\n`);
}

function surfaceDescription(surface: (typeof SURFACES)[number]): string {
  const hints: string[] = [];
  if (surface.url.startsWith("/") && ["page", "listing", "detail"].includes(surface.section)) {
    hints.push(`Markdown: ${markdownUrlForRoute(surface.url)}`);
  }
  if (surface.section === "api") hints.push("Format: JSON");
  if (surface.section === "data" || surface.section === "feed") hints.push("Auth: none");
  return hints.length === 0
    ? surface.description
    : `${surface.description} ${hints.map((hint) => `(${hint})`).join(" ")}`;
}

main();
