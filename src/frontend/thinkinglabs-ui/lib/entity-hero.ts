import type { ImageMetadata } from "astro";
import fallbackHero from "../../../assets/hero.png";
import {
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

/** Resolve a detail page's hero artwork by route folder + detail slug; falls back to `src/assets/hero.png` when no per-entity asset exists. */
export function resolveEntityHero(folder: string, slug: string): ImageMetadata {
  return entityHeroes.get(heroAssetKey(folder, slug))?.image ?? fallbackHero;
}
