import { expect, test } from "@playwright/test";

const ENDPOINTS = ["/api/predictions.json", "/api/provenance.json"] as const;

test.describe("collection JSON endpoints", () => {
  for (const endpoint of ENDPOINTS) {
    test(`${endpoint} returns 200 with JSON array body`, async ({ request }) => {
      const response = await request.get(endpoint);
      expect(response.status(), `status for ${endpoint}`).toBe(200);

      const contentType = response.headers()["content-type"] ?? "";
      expect(contentType.toLowerCase()).toContain("application/json");

      const body = (await response.json()) as unknown;
      expect(Array.isArray(body), `${endpoint} body must be an array`).toBe(true);
    });
  }
});
