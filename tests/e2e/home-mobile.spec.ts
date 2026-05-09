import { expect, test } from "@playwright/test";

const cardCopies = [
  "Long-form prose, by recency.",
  "Atomic structured claims with confidence and evidence.",
  "Active and dormant work, grouped by status.",
  "Falsifiable predictions, pending and resolved.",
  "Belief revisions, by date.",
  "ADR-style public decisions.",
  "Open questions I'm stuck on.",
  "Long-form evergreen posts with per-section freshness.",
  "External material that shaped thinking.",
];

test.describe("mobile home page", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("renders visible copy for every landing card", async ({ page }) => {
    const response = await page.goto("/");
    expect(response, "navigation response").not.toBeNull();
    expect(response!.status()).toBe(200);

    const cards = page.locator(".tl-gallery-card");
    await expect(cards).toHaveCount(cardCopies.length);

    for (const copy of cardCopies) {
      await expect(page.getByText(copy, { exact: false })).toBeVisible();
    }
  });
});
