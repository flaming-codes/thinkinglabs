import { expect, test } from "@playwright/test";

const STORAGE_KEY = "me.embed.prediction-calibration-logger.v1";

test.describe("/predictions/calibration embedded tool", () => {
  test("page renders, embed mounts, and localStorage flow updates aria-live summary", async ({
    page,
  }) => {
    const response = await page.goto("/predictions/calibration");
    expect(response, "navigation response").not.toBeNull();
    expect(response!.status()).toBe(200);

    const root = page.locator("[data-embedded-tool='local-prediction-calibration-logger']");
    await expect(root).toHaveCount(1);

    const summary = root.locator("[data-local-summary][aria-live='polite']");
    await expect(summary).toBeVisible();

    const recordButton = root.locator("button[data-record]");
    await expect(recordButton).toBeEnabled();

    await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);

    const initialText = await summary.textContent();

    await root.locator("input[name='confidence']").fill("80");
    await root.locator("select[name='resolved']").selectOption("true");
    await recordButton.click();

    await expect(summary).toHaveText(/1 local entry stored/i);
    expect(await summary.textContent()).not.toBe(initialText);

    const stored = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? "[]") as ReadonlyArray<{ confidence: number }>;
    expect(parsed.length).toBe(1);
    expect(parsed[0]?.confidence).toBeGreaterThan(0);
  });
});
