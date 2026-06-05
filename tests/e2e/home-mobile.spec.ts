import { expect, test } from "@playwright/test";

const sectionLabels = [
  "now",
  "thoughts",
  "claims",
  "predictions",
  "decisions",
  "observations",
  "changed my mind",
  "questions",
  "projects",
  "posts",
  "about",
  "contact",
];

test.describe("mobile home page", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("renders the section index with every link visible", async ({ page }) => {
    const response = await page.goto("/");
    expect(response, "navigation response").not.toBeNull();
    expect(response!.status()).toBe(200);

    const nav = page.locator("nav[aria-label='Site sections']");
    await expect(nav).toBeVisible();

    const links = nav.locator("a[href]");
    await expect(links).toHaveCount(sectionLabels.length);

    for (const label of sectionLabels) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });
});
