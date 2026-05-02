import { expect, test } from "@playwright/test";

test.describe("top navigation", () => {
  test("each top-nav link resolves to a 200 page with a heading", async ({ page }) => {
    const root = await page.goto("/");
    expect(root, "navigation response").not.toBeNull();
    expect(root!.status()).toBe(200);

    const links = page.locator("header.site .inner a.nav");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    const hrefs: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      if (href && href.startsWith("/")) hrefs.push(href);
    }
    expect(hrefs.length).toBe(count);

    for (const href of hrefs) {
      const response = await page.goto(href);
      expect(response, `navigation to ${href}`).not.toBeNull();
      expect(response!.status(), `status for ${href}`).toBe(200);
      const heading = page.locator("h1, h2").first();
      await expect(heading, `heading on ${href}`).toBeVisible();
    }
  });
});
