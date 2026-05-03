import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook-astro/framework";
import type { Plugin } from "vite";

/** Stubs Astro virtual modules that only exist inside the Astro dev server (e.g. `astro:toolbar:internal`), so Storybook's Vite can resolve transitive imports from `astro/dist/runtime/client`. */
const astroVirtualStubs = (): Plugin => ({
  name: "thinkinglabs:astro-virtual-stubs",
  enforce: "pre",
  resolveId(id) {
    if (id === "astro:toolbar:internal") return `\0${id}`;
    return null;
  },
  load(id) {
    if (id === "\0astro:toolbar:internal") {
      return "export const loadDevToolbarApps = () => {};\n";
    }
    return null;
  },
});

const config: StorybookConfig = {
  stories: ["./stories/**/*.stories.@(astro|js|jsx|mjs|ts|tsx|mdx)"],
  addons: [],
  framework: {
    name: "@storybook-astro/framework",
    options: {},
  },
  staticDirs: ["../public"],
  async viteFinal(viteConfig) {
    viteConfig.resolve ??= {};
    const aliasPath = fileURLToPath(new URL("../src", import.meta.url));
    const existingAlias = viteConfig.resolve.alias;

    if (Array.isArray(existingAlias)) {
      existingAlias.push({
        find: "@",
        replacement: aliasPath,
      });
    } else if (existingAlias) {
      viteConfig.resolve.alias = {
        ...existingAlias,
        "@": aliasPath,
      };
    } else {
      viteConfig.resolve.alias = { "@": aliasPath };
    }

    viteConfig.plugins ??= [];
    viteConfig.plugins.push(astroVirtualStubs());

    viteConfig.optimizeDeps ??= {};
    viteConfig.optimizeDeps.exclude = [
      ...(viteConfig.optimizeDeps.exclude ?? []),
      "astro:toolbar:internal",
    ];

    return viteConfig;
  },
};

export default config;
