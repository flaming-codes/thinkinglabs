import { defineConfig } from "astro/config";
import remarkSectionFreshness from "./src/markdown/remark-section-freshness.ts";
import rehypeSectionFreshness from "./src/markdown/rehype-section-freshness.ts";

/** Astro entry config — content collections live in src/content.config.ts; markdown plugins extend headings with per-section freshness. */
export default defineConfig({
  site: "https://tom.wild.as",
  trailingSlash: "ignore",
  markdown: {
    remarkPlugins: [remarkSectionFreshness],
    rehypePlugins: [rehypeSectionFreshness],
  },
});
