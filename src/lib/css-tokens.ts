import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS_PATH = join(process.cwd(), "src/frontend/thinkinglabs-ui/styles.css");
const VARIABLE_RE = /(--tl-[\w-]+)\s*:\s*([^;]+);/g;
const VAR_REFERENCE_RE = /var\(\s*(--tl-[\w-]+)(?:\s*,\s*([^)]+))?\)/g;

type Scheme = "light" | "dark";

interface TokenCache {
  light: Map<string, string>;
  dark: Map<string, string>;
}

let cache: TokenCache | undefined;

function readCss(): string {
  return readFileSync(CSS_PATH, "utf8");
}

function blockAfter(css: string, marker: string): string {
  const start = css.indexOf(marker);
  if (start === -1) return "";
  const braceStart = css.indexOf("{", start);
  if (braceStart === -1) return "";

  let depth = 0;
  for (let index = braceStart; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") depth += 1;
    if (char !== "}") continue;
    depth -= 1;
    if (depth === 0) return css.slice(braceStart + 1, index);
  }

  return "";
}

function readVariables(block: string): Map<string, string> {
  const variables = new Map<string, string>();
  for (const match of block.matchAll(VARIABLE_RE)) {
    const [, name, value] = match;
    if (!name || !value) continue;
    variables.set(name, value.replace(/\s+/g, " ").trim());
  }
  return variables;
}

function readTokenCache(): TokenCache {
  if (cache) return cache;

  const css = readCss();
  const light = readVariables(blockAfter(css, ":root"));
  const darkOverrides = readVariables(blockAfter(css, "@media (prefers-color-scheme: dark)"));
  const dark = new Map(light);
  for (const [name, value] of darkOverrides) dark.set(name, value);

  cache = { light, dark };
  return cache;
}

function resolveValue(variables: Map<string, string>, value: string, seen: Set<string>): string {
  return value
    .replace(VAR_REFERENCE_RE, (_match, name: string, fallback: string | undefined) => {
      if (seen.has(name)) return fallback?.trim() ?? "";
      const next = variables.get(name);
      if (!next) return fallback?.trim() ?? "";
      seen.add(name);
      return resolveValue(variables, next, seen);
    })
    .trim();
}

/** Reads and resolves one Thinkinglabs CSS custom property for server-side build consumers. */
export function readThinkinglabsCssToken(name: string, scheme: Scheme = "light"): string {
  const variables = readTokenCache()[scheme];
  const value = variables.get(name);
  if (!value) throw new Error(`Missing Thinkinglabs CSS token ${name} for ${scheme}`);
  return resolveValue(variables, value, new Set([name]));
}

/** Returns the light and dark browser theme colors from the shared CSS token source. */
export function readThinkinglabsThemeColors(): {
  readonly light: string;
  readonly dark: string;
} {
  return {
    light: readThinkinglabsCssToken("--tl-theme-color", "light"),
    dark: readThinkinglabsCssToken("--tl-theme-color", "dark"),
  };
}
