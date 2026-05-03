import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { KIND_REGISTRY } from "../src/lib/registry.ts";
import { SURFACES } from "../src/lib/surfaces.ts";
import { KINDS } from "../src/schemas/index.ts";

describe("surface inventory", () => {
  it("does not expose provenance JSON API surface", () => {
    const provenanceSurface = SURFACES.find((s) => s.url === "/api/provenance.json");
    expect(provenanceSurface).toBeUndefined();
  });

  it("only includes collection APIs for kinds marked api=true", () => {
    const collectionApiUrls = SURFACES.filter(
      (s) => s.section === "api" && /^\/api\/[^/]+\.json$/.test(s.url),
    ).map((s) => s.url);
    const expectedUrls = KINDS.filter((k) => KIND_REGISTRY[k].api).map((k) => `/api/${k}.json`);
    const nonApiUrls = KINDS.filter((k) => !KIND_REGISTRY[k].api).map((k) => `/api/${k}.json`);

    expect(new Set(collectionApiUrls)).toEqual(new Set(expectedUrls));
    for (const nonApiUrl of nonApiUrls) expect(collectionApiUrls).not.toContain(nonApiUrl);
  });

  it("keeps llms.txt free of provenance endpoints", () => {
    const llms = readFileSync(new URL("../public/llms.txt", import.meta.url), "utf8");
    expect(llms).not.toContain("/api/provenance.json");
    expect(llms).not.toContain("thinkinglabs://provenance");
  });
});
