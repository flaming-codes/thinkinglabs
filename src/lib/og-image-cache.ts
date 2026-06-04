import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/** Default persistent directory for prerendered Open Graph PNGs. */
export const OG_IMAGE_CACHE_DIR = ".cache/og-images";

interface OgImageCacheOptions {
  readonly cacheDir?: string;
  readonly routeSlug: string;
  readonly props: unknown;
  readonly renderInputs: unknown;
  readonly sourceFilePaths: ReadonlyArray<string>;
  readonly fontFilePaths: ReadonlyArray<string>;
  readonly heroAssetPath?: string | undefined;
}

interface OgImageCacheEntry {
  readonly cacheDir: string;
  readonly filename: string;
  readonly path: string;
  readonly routeId: string;
}

const fileHashCache = new Map<string, Promise<string>>();

/** Computes the route-scoped cache filename from all inputs that can affect PNG bytes. */
export async function createOgImageCacheEntry(
  options: OgImageCacheOptions,
): Promise<OgImageCacheEntry> {
  const cacheDir = options.cacheDir ?? OG_IMAGE_CACHE_DIR;
  const sourceHashes = await hashFiles(options.sourceFilePaths);
  const fontHashes = await hashFiles(options.fontFilePaths);
  const heroAssetHash = options.heroAssetPath ? await hashFile(options.heroAssetPath) : null;
  const routeId = digest(options.routeSlug).slice(0, 16);
  const cacheKey = digest({
    version: 1,
    routeSlug: options.routeSlug,
    props: options.props,
    renderInputs: options.renderInputs,
    sourceHashes,
    fontHashes,
    heroAssetHash,
  });
  const filename = `${routeId}.${cacheKey}.png`;

  return {
    cacheDir,
    filename,
    path: join(cacheDir, filename),
    routeId,
  };
}

/** Reads cached PNG bytes, returning undefined when the exact variant is absent. */
export async function readOgImageCache(entry: OgImageCacheEntry): Promise<Buffer | undefined> {
  try {
    return await readFile(entry.path);
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

/** Writes PNG bytes atomically, then removes older variants for the same OG route. */
export async function writeOgImageCache(entry: OgImageCacheEntry, png: Uint8Array): Promise<void> {
  await writeFileAtomic(entry.path, png);
  await removeStaleOgImageVariants(entry);
}

/** Removes obsolete cache files that belong to the same route but a different cache key. */
export async function removeStaleOgImageVariants(entry: OgImageCacheEntry): Promise<void> {
  let files: string[];
  try {
    files = await readdir(entry.cacheDir);
  } catch (error) {
    if (isNotFound(error)) return;
    throw error;
  }

  await Promise.all(
    files
      .filter((file) => file.startsWith(`${entry.routeId}.`) && file !== entry.filename)
      .map((file) => rm(join(entry.cacheDir, file), { force: true })),
  );
}

/** Returns a SHA-256 hex digest for strings or stable JSON-serializable values. */
export function digest(value: unknown): string {
  const data = typeof value === "string" ? value : stableJson(value);
  return createHash("sha256").update(data).digest("hex");
}

async function writeFileAtomic(path: string, png: Uint8Array): Promise<void> {
  const dir = dirname(path);
  const tempPath = join(dir, `.tmp-${process.pid}-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  await writeFile(tempPath, png);
  await rename(tempPath, path);
}

async function hashFiles(paths: ReadonlyArray<string>): Promise<ReadonlyArray<[string, string]>> {
  return Promise.all(paths.map(async (path) => [path, await hashFile(path)] as const));
}

function hashFile(path: string): Promise<string> {
  let cached = fileHashCache.get(path);
  if (!cached) {
    cached = readFile(path).then((buffer) => digest(buffer.toString("base64")));
    fileHashCache.set(path, cached);
  }
  return cached;
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortValue((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
