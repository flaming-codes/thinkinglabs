import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

describe("service worker offline resilience", () => {
  const root = process.cwd();
  const swPath = resolve(root, "public/sw.js");

  it("defines cache versioning, precaching, and fallback routes", () => {
    const sw = readFileSync(swPath, "utf8");

    expect(sw).toContain("const CACHE_NAME =");
    expect(sw).toContain('const OFFLINE_FALLBACK = "/offline"');
    expect(sw).toContain('"/offline"');
    expect(sw).toContain('"/manifest.webmanifest"');
    expect(sw).toContain('"/pwa-192x192.png"');
    expect(sw).toContain("cache.addAll(PRECACHE_ASSETS)");
    expect(sw).toContain('request.mode === "navigate"');
  });
});
