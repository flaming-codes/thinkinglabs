import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

describe("PWA manifest", () => {
  const root = process.cwd();
  const manifestPath = resolve(root, "public/manifest.webmanifest");

  it("contains required installability and grading metadata", () => {
    const raw = readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(raw);

    expect(manifest.name).toBe("thinkinglabs");
    expect(manifest.short_name).toBe("thinkinglabs");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.orientation).toBe("any");
    expect(manifest.prefer_related_applications).toBe(false);
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.some((i: any) => i.sizes === "192x192")).toBe(true);
    expect(manifest.icons.some((i: any) => i.sizes === "512x512")).toBe(true);
    expect(manifest.icons.some((i: any) => i.purpose === "maskable")).toBe(true);
  });

  it("includes valid shortcuts for primary sections", () => {
    const raw = readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(raw);

    expect(Array.isArray(manifest.shortcuts)).toBe(true);
    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(4);
    const urls = manifest.shortcuts.map((s: any) => s.url);
    expect(urls).toContain("/thoughts");
    expect(urls).toContain("/claims");
    expect(urls).toContain("/now");
    expect(urls).toContain("/agents");
  });

  it("includes valid wide and narrow screenshots referencing existing files", () => {
    const raw = readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(raw);

    expect(Array.isArray(manifest.screenshots)).toBe(true);
    expect(manifest.screenshots.length).toBeGreaterThanOrEqual(2);

    const wide = manifest.screenshots.find((s: any) => s.form_factor === "wide");
    expect(wide).toBeDefined();
    expect(wide.src).toBe("/screenshots/desktop-home.webp");
    expect(wide.sizes).toBe("1280x720");
    expect(wide.type).toBe("image/webp");
    expect(existsSync(resolve(root, "public", wide.src.replace(/^\//, "")))).toBe(true);

    const narrow = manifest.screenshots.find((s: any) => s.form_factor === "narrow");
    expect(narrow).toBeDefined();
    expect(narrow.src).toBe("/screenshots/mobile-home.webp");
    expect(narrow.sizes).toBe("540x720");
    expect(narrow.type).toBe("image/webp");
    expect(existsSync(resolve(root, "public", narrow.src.replace(/^\//, "")))).toBe(true);
  });
});
