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

    const detailStyles = await page.locator(".tl-thought-detail").evaluate((node) => {
      const detail = getComputedStyle(node);
      const hero = getComputedStyle(document.querySelector(".tl-thought-hero-art")!);
      const heading = getComputedStyle(document.querySelector(".tl-thought-title h1")!);

      return {
        detailPaddingTop: detail.paddingTop,
        heroMinHeight: hero.minHeight,
        headingTransform: heading.textTransform,
        headingWeight: heading.fontWeight,
      };
    });

    expect(parseFloat(detailStyles.detailPaddingTop)).toBeGreaterThan(0);
    expect(parseFloat(detailStyles.heroMinHeight)).toBeGreaterThan(0);
    expect(detailStyles.headingTransform).toBe("uppercase");
    expect(Number(detailStyles.headingWeight)).toBeGreaterThanOrEqual(700);
    expect(cspViolations).toEqual([]);
  });
});
