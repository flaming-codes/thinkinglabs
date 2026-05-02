import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

test.describe("/predictions/calibration without JavaScript", () => {
  test("renders the static fallback table and never enables the record button", async ({
    page,
  }) => {
    const response = await page.goto("/predictions/calibration");
    expect(response, "navigation response").not.toBeNull();
    expect(response!.status()).toBe(200);

    const root = page.locator("[data-embedded-tool='local-prediction-calibration-logger']");
    await expect(root).toHaveCount(1);

    const fallback = root.locator("table.embedded-tool__fallback");
    await expect(fallback).toBeVisible();
    const rowCount = await fallback.locator("tbody tr").count();
    expect(rowCount).toBeGreaterThan(0);

    const button = root.locator("button[data-record]");
    await expect(button).toBeDisabled();

    const noscript = root.locator("noscript");
    expect(await noscript.count()).toBeGreaterThan(0);
  });
});
