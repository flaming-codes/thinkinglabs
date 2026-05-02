import { expect, test } from "@playwright/test";
import { KINDS } from "../../src/schemas/index.ts";
import { KIND_REGISTRY } from "../../src/lib/registry.ts";

/** Every kind exposed via /api/<kind>.json. Derived from the registry so new kinds get coverage automatically. */
const COLLECTION_ENDPOINTS: ReadonlyArray<string> = KINDS.filter((k) => KIND_REGISTRY[k].api).map(
  (k) => `/api/${k}.json`,
);

test.describe("collection JSON endpoints", () => {
  for (const endpoint of COLLECTION_ENDPOINTS) {
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

test.describe("embed JSON endpoint", () => {
  test("/api/embed/prediction-calibration-logger.json returns 200 with object body", async ({
    request,
  }) => {
    const response = await request.get("/api/embed/prediction-calibration-logger.json");
    expect(response.status()).toBe(200);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType.toLowerCase()).toContain("application/json");
    const body = (await response.json()) as Record<string, unknown>;
    expect(body, "embed body is a non-null object").toEqual(expect.any(Object));
  });

  test("/api/embed/<unknown>.json returns 404", async ({ request }) => {
    const response = await request.get("/api/embed/does-not-exist.json");
    expect(response.status()).toBe(404);
  });
});
