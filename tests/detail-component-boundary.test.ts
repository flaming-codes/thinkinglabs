import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("detail component boundaries", () => {
  it("keeps error pages on the generic detail base", () => {
    for (const page of ["src/pages/404.astro", "src/pages/500.astro"]) {
      const text = source(page);
      expect(text, `${page} should import the generic detail page`).toContain("DetailPage");
      expect(text, `${page} should not import EntityDetail`).not.toContain("EntityDetail");
    }
  });

  it("keeps EntityDetail as a wrapper over DetailPage", () => {
    const text = source("src/frontend/thinkinglabs-ui/components/EntityDetail.astro");

    expect(text).toContain('import DetailPage from "./DetailPage.astro"');
    expect(text).not.toContain('from "./EntityHero.astro"');
    expect(text).not.toContain('from "./EntityBody.astro"');
    expect(text).not.toContain('from "./EntityFooter.astro"');
  });
});
