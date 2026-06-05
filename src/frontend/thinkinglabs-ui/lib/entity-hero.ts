import type { ImageMetadata } from "astro";
import fallbackHero from "../../../assets/hero.png";

/* Eager glob over every per-entity hero asset under src/assets. Astro needs a static glob literal, so the pattern cannot be parameterised. */
const assetModules = import.meta.glob<{ default: ImageMetadata }>(
  "../../../assets/**/*.{png,jpg,jpeg,webp}",
  { eager: true },
);

const ASSET_PREFIX = "../../../assets/";

/* Index the glob by `<folder>/<slug>` (the route shape, extension stripped). */
const entityHeroes = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(assetModules)) {
  const key = path.slice(ASSET_PREFIX.length).replace(/\.[^./]+$/, "");
  entityHeroes.set(key, mod.default);
}

/** Resolve a detail page's hero artwork by route folder + detail slug; falls back to `src/assets/hero.png` when no per-entity asset exists. */
export function resolveEntityHero(folder: string, slug: string): ImageMetadata {
  return entityHeroes.get(`${folder}/${slug}`) ?? fallbackHero;
}
