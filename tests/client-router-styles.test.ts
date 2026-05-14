import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";

describe("client-router styling contract", () => {
  it("keeps Astro route CSS external so CSP does not block client-routed pages", () => {
    const config = readFileSync(join(process.cwd(), "astro.config.mjs"), "utf8");

    expect(config).toContain('inlineStylesheets: "never"');
  });

  it("uses the unified Thinkinglabs UI layout instead of the legacy Base layout", () => {
    expect(existsSync(join(process.cwd(), "src/layouts/Base.astro"))).toBe(false);

    const pageFiles = [
      "src/pages/contact.astro",
      "src/pages/index.astro",
      "src/pages/thoughts/[...slug].astro",
    ];

    for (const pageFile of pageFiles) {
      const source = readFileSync(join(process.cwd(), pageFile), "utf8");
      expect(source).not.toContain("Base.astro");
      expect(source).toContain("ThinkinglabsUiPage");
    }
  });
});
