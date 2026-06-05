import type { ImageMetadata } from "astro";
import {
  FALLBACK_HERO_KEY,
  heroAssetExtensionRank,
  heroAssetKey,
  heroAssetKeyFromPath,
} from "../../../lib/hero-assets.ts";

/* Eager glob over every per-entity hero asset under src/assets. Astro needs a static glob literal, so the pattern cannot be parameterised. */
const assetModules = import.meta.glob<{ default: ImageMetadata }>(
  "../../../assets/**/*.{avif,webp,png,jpg,jpeg}",
  { eager: true },
);

const ASSET_PREFIX = "../../../assets/";

/* Index the glob by `<folder>/<slug>` and keep the configured extension precedence deterministic. */
const entityHeroes = new Map<
  string,
  { readonly image: ImageMetadata; readonly extensionRank: number }
>();
for (const [path, mod] of Object.entries(assetModules)) {
  const key = heroAssetKeyFromPath(path, ASSET_PREFIX);
  const extension = path.slice(path.lastIndexOf(".") + 1);
  const extensionRank = heroAssetExtensionRank(extension);
  if (!key || extensionRank === null) continue;
  const current = entityHeroes.get(key);
  if (!current || extensionRank < current.extensionRank) {
    entityHeroes.set(key, { image: mod.default, extensionRank });
  }
}

const fallbackHero: ImageMetadata = (() => {
  const image = entityHeroes.get(FALLBACK_HERO_KEY)?.image;
  if (!image) {
    throw new Error(`Missing fallback hero asset: src/assets/${FALLBACK_HERO_KEY}.<ext>`);
  }
  return image;
})();

/** Resolve a detail page's hero artwork by route folder + detail slug; falls back to the shared `src/assets/hero.<ext>` asset when no per-entity asset exists. */
export function resolveEntityHero(folder: string, slug: string): ImageMetadata {
  return entityHeroes.get(heroAssetKey(folder, slug))?.image ?? fallbackHero;
}
