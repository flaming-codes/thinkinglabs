#!/usr/bin/env tsx
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadContact } from "../src/lib/contact.ts";
import { SECTION_ORDER, SECTION_TITLES, SURFACES } from "../src/lib/surfaces.ts";

/** Generates `public/llms.txt` from the shared surfaces inventory; runs as a `prebuild` step so the file exists before astro copies `public/`. */
function main(): void {
  loadContact();
  const sections = new Map<string, (typeof SURFACES)[number][]>();
  for (const s of SURFACES) {
    const list = sections.get(s.section) ?? [];
    list.push(s);
    sections.set(s.section, list);
  }
  const lines: string[] = [
    "# Tom — wild.as",
    "",
    "> Personal thinking surface. Markdown source-of-truth at https://github.com/tom/me. Every page below renders from `content/<kind>/`.",
    "",
  ];
  for (const key of SECTION_ORDER) {
    const items = sections.get(key);
    if (!items || items.length === 0) continue;
    lines.push(`## ${SECTION_TITLES[key]}`, "");
    for (const s of items) lines.push(`- [${s.title}](${s.url}): ${s.description}`);
    lines.push("");
  }
  const out = resolve(process.cwd(), "public/llms.txt");
  writeFileSync(out, lines.join("\n"));
  process.stdout.write(`wrote ${out}\n`);
}

main();
