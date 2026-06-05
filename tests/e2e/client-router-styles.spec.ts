import { expect, test } from "@playwright/test";

test.describe("client-routed detail pages", () => {
  test("load destination component styles under CSP", async ({ page }) => {
    const cspViolations: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (text.includes("Content Security Policy") || text.includes("violates")) {
        cspViolations.push(text);
      }
    });

    const response = await page.goto("/thoughts/");
    expect(response, "listing response").not.toBeNull();
    expect(response!.status()).toBe(200);

    await page.getByRole("link", { name: "The agent harness is the new IDE" }).click();
    await expect(page).toHaveURL(/\/thoughts\/agent-harness-is-the-new-ide\/?$/);
    await expect(
      page.getByRole("heading", { name: "The agent harness is the new IDE" }),
    ).toBeVisible();

    const detailStyles = await page.locator(".tl-hero-frame").evaluate((node) => {
      const hero = getComputedStyle(node);
      const article = getComputedStyle(document.querySelector(".detail-prose")!);
      const firstParagraph = getComputedStyle(document.querySelector(".detail-prose p")!);

      return {
        heroHeight: hero.height,
        proseMaxWidth: article.maxWidth,
        paragraphMarginTop: firstParagraph.marginTop,
      };
    });

    expect(parseFloat(detailStyles.heroHeight)).toBeGreaterThan(0);
    expect(parseFloat(detailStyles.proseMaxWidth)).toBeGreaterThan(0);
    expect(parseFloat(detailStyles.paragraphMarginTop)).toBeGreaterThan(0);
    expect(cspViolations).toEqual([]);
  });
});
