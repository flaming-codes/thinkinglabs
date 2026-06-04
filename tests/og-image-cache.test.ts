import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  createOgImageCacheEntry,
  readOgImageCache,
  writeOgImageCache,
} from "../src/lib/og-image-cache.ts";

let root: string;
let cacheDir: string;
let sourceFile: string;
let fontFile: string;
let heroFile: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "og-image-cache-"));
  cacheDir = join(root, ".cache", "og-images");
  sourceFile = join(root, "route.ts");
  fontFile = join(root, "font.woff");
  heroFile = join(root, "hero.png");
  writeFileSync(sourceFile, "render source");
  writeFileSync(fontFile, "font bytes");
  writeFileSync(heroFile, "hero bytes");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("og image cache", () => {
  it("builds a stable key for the same inputs", async () => {
    const first = await createEntry();
    const second = await createEntry();

    expect(second.filename).toBe(first.filename);
    expect(second.path).toBe(first.path);
  });

  it("changes the key when route, render, or asset inputs change", async () => {
    const original = await createEntry();
    const routeChanged = await createEntry({ routeSlug: "thoughts/elsewhere" });
    const renderChanged = await createEntry({ renderInputs: { width: 1200, height: 630 } });
    const otherHero = join(root, "other-hero.png");
    writeFileSync(otherHero, "other hero bytes");
    const assetChanged = await createEntry({ heroAssetPath: otherHero });

    expect(routeChanged.filename).not.toBe(original.filename);
    expect(renderChanged.filename).not.toBe(original.filename);
    expect(assetChanged.filename).not.toBe(original.filename);
  });

  it("returns no hit when the cache file is missing", async () => {
    const entry = await createEntry();

    await expect(readOgImageCache(entry)).resolves.toBeUndefined();
  });

  it("writes and reads identical PNG bytes", async () => {
    const entry = await createEntry();
    const png = Uint8Array.from([137, 80, 78, 71, 1, 2, 3]);

    await writeOgImageCache(entry, png);

    await expect(readOgImageCache(entry)).resolves.toEqual(Buffer.from(png));
  });

  it("removes stale variants for the same route after a new write", async () => {
    const oldEntry = await createEntry({ props: { title: "Old" } });
    const newEntry = await createEntry({ props: { title: "New" } });

    await writeOgImageCache(oldEntry, Uint8Array.from([1]));
    expect(existsSync(oldEntry.path)).toBe(true);

    await writeOgImageCache(newEntry, Uint8Array.from([2]));

    expect(existsSync(oldEntry.path)).toBe(false);
    expect(existsSync(newEntry.path)).toBe(true);
    expect(readdirSync(cacheDir)).toEqual([newEntry.filename]);
  });
});

function createEntry(
  overrides: Partial<Parameters<typeof createOgImageCacheEntry>[0]> = {},
): ReturnType<typeof createOgImageCacheEntry> {
  return createOgImageCacheEntry({
    cacheDir,
    routeSlug: "thoughts/example",
    props: { title: "Example", layout: "quiet-bl", palette: ["#111111", "#222222", "#333333"] },
    renderInputs: { width: 1200, height: 628 },
    sourceFilePaths: [sourceFile],
    fontFilePaths: [fontFile],
    heroAssetPath: heroFile,
    ...overrides,
  });
}
