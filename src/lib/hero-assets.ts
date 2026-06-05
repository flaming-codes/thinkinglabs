/** Supported local hero image extensions, ordered from most to least preferred when multiple assets exist. */
export const HERO_ASSET_EXTENSIONS = ["avif", "webp", "png", "jpg", "jpeg"] as const;

/** Shared fallback hero key used when an entity or surface has no custom local asset. */
export const FALLBACK_HERO_KEY = "hero";

/** Shared fallback hero used when no preferred fallback format can be found. */
export const FALLBACK_HERO_SOURCE = "src/assets/hero.webp";

/** One supported local hero image extension. */
export type HeroAssetExtension = (typeof HERO_ASSET_EXTENSIONS)[number];

/** Inputs needed to resolve a local hero image without coupling callers to filesystem APIs. */
export interface ResolveHeroSourceOptions {
  readonly folder: string;
  readonly slug: string;
  readonly exists: (path: string) => boolean;
  readonly assetsRoot?: string | undefined;
  readonly fallback?: string | undefined;
}

/** Return the extensionless route-shaped key used to index hero assets. */
export function heroAssetKey(folder: string, slug: string): string {
  return `${folder}/${slug}`;
}

/** Build the documented `src/assets/<kind>/<slug>.<ext>` hero path. */
export function heroAssetPath(folder: string, slug: string, extension: HeroAssetExtension): string {
  return `src/assets/${heroAssetKey(folder, slug)}.${extension}`;
}

/** Build the documented `src/assets/<slug>.<ext>` top-level hero path. */
export function topLevelHeroAssetPath(
  slug: string,
  extension: HeroAssetExtension,
  assetsRoot = "src/assets",
): string {
  return `${assetsRoot}/${slug}.${extension}`;
}

/** Return the configured precedence rank for a supported hero extension. */
export function heroAssetExtensionRank(extension: string): number | null {
  const rank = HERO_ASSET_EXTENSIONS.indexOf(extension as HeroAssetExtension);
  return rank === -1 ? null : rank;
}

/** Extract an extensionless asset key from an Astro glob path when its extension is supported. */
export function heroAssetKeyFromPath(path: string, assetsPrefix: string): string | null {
  if (!path.startsWith(assetsPrefix)) return null;
  const relative = path.slice(assetsPrefix.length);
  const match = relative.match(/^(.*)\.([^./]+)$/);
  if (!match?.[1] || !match[2]) return null;
  return heroAssetExtensionRank(match[2]) === null ? null : match[1];
}

/** Resolve the first existing shared fallback hero by configured extension precedence. */
export function resolveFallbackHeroSource({
  exists,
  assetsRoot = "src/assets",
  fallback = FALLBACK_HERO_SOURCE,
}: Pick<ResolveHeroSourceOptions, "exists" | "assetsRoot" | "fallback">): string {
  for (const extension of HERO_ASSET_EXTENSIONS) {
    const candidate = topLevelHeroAssetPath(FALLBACK_HERO_KEY, extension, assetsRoot);
    if (exists(candidate)) return candidate;
  }
  return fallback;
}

/** Resolve the first existing local hero source by configured extension precedence, otherwise return the fallback. */
export function resolveHeroSource({
  folder,
  slug,
  exists,
  assetsRoot = "src/assets",
  fallback,
}: ResolveHeroSourceOptions): string {
  for (const extension of HERO_ASSET_EXTENSIONS) {
    const candidate = `${assetsRoot}/${heroAssetKey(folder, slug)}.${extension}`;
    if (exists(candidate)) return candidate;
  }
  return resolveFallbackHeroSource({ exists, assetsRoot, fallback });
}
