import { describe, expect, it } from "vite-plus/test";
import { GET } from "../../src/pages/api/embed/[id].json.ts";
import { embeddedTools } from "../../embeds/index.ts";

/** Builds a minimal APIContext-like object accepted by the route handler. */
function ctx(id: string | undefined): unknown {
  return {
    params: id === undefined ? {} : { id },
    request: new Request(`http://localhost/api/embed/${id ?? "missing"}.json`),
    url: new URL(`http://localhost/api/embed/${id ?? "missing"}.json`),
    site: new URL("http://localhost/"),
  };
}

describe("/api/embed/[id].json route handler", () => {
  it("returns the payload for a known embed id with JSON content-type", async () => {
    const known = embeddedTools[0]?.contract.id;
    expect(known).toBeTruthy();
    const response = (await GET(ctx(known) as never)) as Response;
    expect(response.status).toBe(200);
    expect((response.headers.get("content-type") ?? "").toLowerCase()).toContain(
      "application/json",
    );
    const body = (await response.json()) as { contract?: { id?: string } };
    expect(body.contract?.id).toBe(known);
  });

  it("returns 404 with JSON body for an unknown id", async () => {
    const response = (await GET(ctx("does-not-exist") as never)) as Response;
    expect(response.status).toBe(404);
    expect((response.headers.get("content-type") ?? "").toLowerCase()).toContain(
      "application/json",
    );
    const body = (await response.json()) as { error?: string };
    expect(typeof body.error).toBe("string");
  });

  it("returns 404 when the id param is missing entirely", async () => {
    const response = (await GET(ctx(undefined) as never)) as Response;
    expect(response.status).toBe(404);
  });
});
