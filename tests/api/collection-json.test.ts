import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

/** Returns a no-arg shape compatible with Astro APIRoute callers; the factory ignores params. */
function emptyContext(): unknown {
  return {
    request: new Request("http://localhost/api/test.json"),
    params: {},
    site: new URL("http://localhost/"),
    url: new URL("http://localhost/api/test.json"),
  };
}

describe("collectionJson — populated kind", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns 200, application/json content-type, and an array of {id, data, body}", async () => {
    const fakeEntries = [
      {
        id: "alpha",
        data: { title: "Alpha", confidence: 0.7 },
        body: "Body A",
      },
      {
        id: "beta",
        data: { title: "Beta", confidence: 0.3 },
        body: "Body B",
      },
    ];
    vi.doMock("astro:content", () => ({
      getCollection: vi.fn(async () => fakeEntries),
    }));

    const { collectionJson } = await import("../../src/lib/api.ts");
    const handler = collectionJson("predictions" as never);
    const response = (await handler(emptyContext() as never)) as Response;

    expect(response.status).toBe(200);
    const ct = response.headers.get("content-type") ?? "";
    expect(ct.toLowerCase().startsWith("application/json")).toBe(true);

    const body = (await response.json()) as Array<{ id: string; data: unknown; body: string }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(2);
    expect(body[0]).toMatchObject({ id: "alpha", body: "Body A" });
    expect(body[0]?.data).toMatchObject({ title: "Alpha" });
    expect(body[1]).toMatchObject({ id: "beta", body: "Body B" });
  });
});

describe("collectionJson — empty kind", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("still returns 200 with an empty array body", async () => {
    vi.doMock("astro:content", () => ({
      getCollection: vi.fn(async () => []),
    }));

    const { collectionJson } = await import("../../src/lib/api.ts");
    const handler = collectionJson("predictions" as never);
    const response = (await handler(emptyContext() as never)) as Response;

    expect(response.status).toBe(200);
    expect((response.headers.get("content-type") ?? "").toLowerCase()).toContain(
      "application/json",
    );

    const body = (await response.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  it("coerces missing entry.body to an empty string", async () => {
    vi.doMock("astro:content", () => ({
      getCollection: vi.fn(async () => [{ id: "x", data: { title: "X" } }]),
    }));
    const { collectionJson } = await import("../../src/lib/api.ts");
    const handler = collectionJson("predictions" as never);
    const response = (await handler(emptyContext() as never)) as Response;
    const body = (await response.json()) as Array<{ id: string; body: string }>;
    expect(body[0]?.body).toBe("");
  });

  it("returns 404 for non-public kinds", async () => {
    const getCollection = vi.fn(async () => []);
    vi.doMock("astro:content", () => ({
      getCollection,
    }));

    const { collectionJson } = await import("../../src/lib/api.ts");
    const handler = collectionJson("provenance" as never);
    const response = (await handler(emptyContext() as never)) as Response;

    expect(response.status).toBe(404);
    expect(getCollection).not.toHaveBeenCalled();
  });
});
