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
    expect(text).toContain('import SiteNav from "./SiteNav.astro"');
    expect(text).toContain('<SiteNav slot="nav" />');
    expect(text).not.toContain('import EntityHero from "./EntityHero.astro"');
    expect(text).not.toContain('import EntityBody from "./EntityBody.astro"');
    expect(text).not.toContain('import EntityFooter from "./EntityFooter.astro"');
  });

  it("keeps the default nav explicit when forwarding nested slots", () => {
    const text = source("src/frontend/thinkinglabs-ui/components/DetailPage.astro");

    expect(text).toContain('import SiteNav from "./SiteNav.astro"');
    expect(text).toContain('<SiteNav slot="nav" />');
  });

  it("keeps generic detail props domain-neutral", () => {
    const page = source("src/frontend/thinkinglabs-ui/components/DetailPage.astro");
    const body = source("src/frontend/thinkinglabs-ui/components/DetailBody.astro");
    const footer = source("src/frontend/thinkinglabs-ui/components/DetailFooter.astro");

    expect(page).toContain("metadata?: DetailMetadataItem[]");
    expect(page).not.toContain("dates?:");
    expect(body).toContain("metadata?: DetailMetadataItem[]");
    expect(body).not.toContain("DetailDate");
    expect(footer).toContain("label: string");
    expect(footer).not.toContain("title: string");
  });
});
