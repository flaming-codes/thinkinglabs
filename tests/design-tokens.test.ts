import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vite-plus/test";

const SOURCE_GLOBS = [
  "src/frontend",
  "src/components",
  "src/pages",
  "src/layouts",
  "src/styles",
] as const;
const TOKEN_SOURCE = "src/frontend/thinkinglabs-ui/styles.css";
const APPROVED_COLOR_SOURCES = new Set([
  TOKEN_SOURCE,
  "src/frontend/thinkinglabs-ui/entity-shader-presets.ts",
]);

function rgFiles(): string[] {
  return execFileSync("rg", ["--files", "-g", "*.{astro,css,ts,tsx}", ...SOURCE_GLOBS], {
    cwd: process.cwd(),
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
}

function source(file: string): string {
  return readFileSync(join(process.cwd(), file), "utf8");
}

function stripComments(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("Thinkinglabs design tokens", () => {
  it("defines the required public token families", () => {
    const css = source(TOKEN_SOURCE);
    const required = [
      "--tl-color-bg",
      "--tl-color-ink",
      "--tl-color-muted",
      "--tl-type-metadata-size",
      "--tl-type-mono-xs",
      "--tl-type-display-xl",
      "--tl-space-page-top",
      "--tl-layout-center",
      "--tl-radius-md",
      "--tl-motion-base",
      "--tl-layer-header",
      "--tl-artifact-card-shadow",
      "--tl-og-bg",
      "--tl-theme-color",
    ];

    for (const token of required) {
      expect(css, `${token} should be defined in ${TOKEN_SOURCE}`).toContain(`${token}:`);
    }
  });

  it("does not reference undefined Thinkinglabs CSS variables", () => {
    const files = rgFiles();
    const definitions = new Set<string>();
    const references: Array<{ file: string; token: string }> = [];

    for (const file of files) {
      const text = stripComments(source(file));
      for (const match of text.matchAll(/(--tl-[\w-]+)\s*:/g)) {
        if (match[1]) definitions.add(match[1]);
      }
      for (const match of text.matchAll(/var\(\s*(--tl-[\w-]+)/g)) {
        if (match[1]) references.push({ file, token: match[1] });
      }
    }

    const missing = references.filter((reference) => !definitions.has(reference.token));
    expect(missing).toEqual([]);
  });

  it("keeps hard-coded UI colors in token or art-preset sources only", () => {
    const offenders = rgFiles().flatMap((file) => {
      if (APPROVED_COLOR_SOURCES.has(file)) return [];
      const text = stripComments(source(file));
      const matches = [
        ...text.matchAll(/#[0-9a-fA-F]{3,8}\b/g),
        ...text.matchAll(/\b(?:rgb|rgba|hsl|hsla)\([^)]*\)/g),
      ];
      return matches.map((match) => {
        const line = text.slice(0, match.index ?? 0).split("\n").length;
        return `${relative(process.cwd(), join(process.cwd(), file))}:${line}: ${match[0]}`;
      });
    });

    expect(offenders).toEqual([]);
  });
});
