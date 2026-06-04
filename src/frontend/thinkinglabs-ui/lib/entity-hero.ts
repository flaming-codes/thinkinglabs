import type { ImageMetadata } from "astro";
import fallbackHero from "../../../assets/hero.png";

// Eager glob over every per-entity hero asset under src/assets. Astro needs a
// static glob literal to resolve and optimise these at build time, so the
// pattern cannot be parameterised - we glob everything once and index it.
const assetModules = import.meta.glob<{ default: ImageMetadata }>(
  "../../../assets/**/*.{png,jpg,jpeg,webp}",
  { eager: true },
);

const ASSET_PREFIX = "../../../assets/";

// Index the glob by `<folder>/<slug>` (the route shape, extension stripped),
// e.g. "thoughts/a-thought-article" -> resolved ImageMetadata.
const entityHeroes = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(assetModules)) {
  const key = path.slice(ASSET_PREFIX.length).replace(/\.[^./]+$/, "");
  entityHeroes.set(key, mod.default);
}

/**
 * Resolve a detail page's hero artwork by route folder + detail slug, matching
 * `src/assets/<folder>/<slug>.{png,jpg,jpeg,webp}`. Falls back to the shared
 * `src/assets/hero.png` when no per-entity asset exists, so callers always get
 * a renderable image.
 *
 * @example resolveEntityHero("thoughts", "a-thought-article")
 */
export function resolveEntityHero(folder: string, slug: string): ImageMetadata {
  return entityHeroes.get(`${folder}/${slug}`) ?? fallbackHero;
}
