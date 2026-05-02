#!/usr/bin/env tsx
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { env } from "../src/lib/env.ts";

const SITE = env().SITE_URL;
const dist = resolve(process.cwd(), "dist");

interface JsonObject {
  readonly [key: string]: unknown;
}

/** Mode flag controlling which assertion suite runs against dist/. */
type Mode = "empty" | "fixtures";

/** Parses --mode=<empty|fixtures> from argv; defaults to empty. */
function parseMode(): Mode {
  const arg = process.argv.slice(2).find((a) => a.startsWith("--mode="));
  const value = arg ? arg.slice("--mode=".length) : "empty";
  if (value !== "empty" && value !== "fixtures") {
    throw new Error(`unknown --mode value: ${value} (expected 'empty' or 'fixtures')`);
  }
  return value;
}

function main(): void {
  if (!existsSync(dist)) throw new Error("dist/ does not exist; run pnpm build first");
  const mode = parseMode();
  const files = walk(dist).filter((file) => file.endsWith(".html"));
  if (files.length === 0) throw new Error("no HTML files found in dist/");

  for (const file of files) {
    const html = readFileSync(file, "utf8");
    const rel = relative(dist, file);
    const canonical = extractTagValue(html, /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/);
    const ogUrl = extractTagValue(html, /<meta\b[^>]*property="og:url"[^>]*content="([^"]+)"/);
    assert(canonical.startsWith(`${SITE}/`), rel, `canonical must be absolute under ${SITE}`);
    assert(ogUrl === canonical, rel, "og:url must match canonical");

    const jsonLd = extractJsonLd(html, rel);
    assert(jsonLd["@context"] === "https://schema.org", rel, "JSON-LD context must be schema.org");
    const graph = jsonLd["@graph"];
    assert(Array.isArray(graph), rel, "JSON-LD must use an @graph array");
    assert(graph.length >= 3, rel, "JSON-LD graph must include site, person, and page nodes");
    assertNoEmpty(jsonLd, rel, "$");
    assertNoRelativeUrls(jsonLd, rel, "$");
    assertIncludesType(graph, "WebSite", rel);
    assertIncludesType(graph, "Person", rel);
    assertIncludesType(graph, "WebPage", rel);

    const page = graph.find((node) => isObject(node) && node["@type"] === "WebPage") as
      | JsonObject
      | undefined;
    assert(page?.url === canonical, rel, "WebPage url must match canonical");
  }

  if (mode === "fixtures") {
    requireFixtureType("posts/_seed/index.html", "BlogPosting");
    requireFixtureType("claims/_seed/index.html", "Claim");
    requireFixtureDoesNotInclude("claims/_seed/index.html", "ClaimReview");
    requireFixtureType("questions/_seed/index.html", "Question");
    requireFixtureDoesNotInclude("questions/_seed/index.html", "QAPage");
  }

  process.stdout.write(
    `checked structured metadata in ${files.length} HTML files (mode=${mode})\n`,
  );
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function extractTagValue(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  if (!match?.[1]) throw new Error(`missing tag matching ${pattern}`);
  return match[1];
}

function extractJsonLd(html: string, rel: string): JsonObject {
  const matches = [
    ...html.matchAll(/<script\b(?=[^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g),
  ];
  assert(matches.length === 1, rel, `expected exactly one JSON-LD script, found ${matches.length}`);
  const raw = matches[0]?.[1];
  assert(typeof raw === "string", rel, "JSON-LD script was empty");
  const parsed = JSON.parse(raw) as unknown;
  assert(isObject(parsed), rel, "JSON-LD root must be an object");
  return parsed;
}

/** In fixtures mode the file MUST exist; missing it is a hard failure (caller forgot the fixture build). */
function requireFixtureType(path: string, type: string): void {
  const file = join(dist, path);
  if (!existsSync(file)) {
    throw new Error(
      `${path}: required fixture HTML missing in dist/. Did you run \`pnpm build:fixtures\` before --mode=fixtures?`,
    );
  }
  const jsonLd = extractJsonLd(readFileSync(file, "utf8"), path);
  const graph = jsonLd["@graph"];
  assert(Array.isArray(graph), path, "fixture JSON-LD must use an @graph array");
  assertIncludesType(graph, type, path);
}

/** In fixtures mode the file MUST exist; missing it is a hard failure. */
function requireFixtureDoesNotInclude(path: string, type: string): void {
  const file = join(dist, path);
  if (!existsSync(file)) {
    throw new Error(
      `${path}: required fixture HTML missing in dist/. Did you run \`pnpm build:fixtures\` before --mode=fixtures?`,
    );
  }
  const jsonLd = extractJsonLd(readFileSync(file, "utf8"), path);
  const graph = jsonLd["@graph"];
  assert(Array.isArray(graph), path, "fixture JSON-LD must use an @graph array");
  assert(!hasType(graph, type), path, `must not include ${type}`);
}

function assertIncludesType(graph: unknown[], type: string, rel: string): void {
  assert(hasType(graph, type), rel, `JSON-LD graph must include ${type}`);
}

function hasType(graph: unknown[], type: string): boolean {
  return graph.some((node) => {
    if (!isObject(node)) return false;
    const actual = node["@type"];
    return actual === type || (Array.isArray(actual) && actual.includes(type));
  });
}

function assertNoEmpty(value: unknown, rel: string, path: string): void {
  if (Array.isArray(value)) {
    assert(value.length > 0, rel, `${path} must not be an empty array`);
    value.forEach((item, index) => assertNoEmpty(item, rel, `${path}[${index}]`));
    return;
  }
  if (!isObject(value)) {
    assert(value !== null && value !== undefined && value !== "", rel, `${path} must not be empty`);
    return;
  }
  const entries = Object.entries(value);
  assert(entries.length > 0, rel, `${path} must not be an empty object`);
  for (const [key, item] of entries) assertNoEmpty(item, rel, `${path}.${key}`);
}

function assertNoRelativeUrls(value: unknown, rel: string, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoRelativeUrls(item, rel, `${path}[${index}]`));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (
      (key === "@id" || key === "url" || key === "item" || key === "sameAs") &&
      typeof item === "string"
    ) {
      assert(!item.startsWith("/"), rel, `${path}.${key} must be absolute`);
      assert(/^https?:\/\//.test(item), rel, `${path}.${key} must be an absolute HTTP URL`);
    }
    assertNoRelativeUrls(item, rel, `${path}.${key}`);
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(condition: unknown, rel: string, message: string): asserts condition {
  if (!condition) throw new Error(`${rel}: ${message}`);
}

main();
