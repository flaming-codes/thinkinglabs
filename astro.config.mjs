import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { unified } from "@astrojs/markdown-remark";
import { env } from "./src/lib/env.ts";
import remarkSectionFreshness from "./src/markdown/remark-section-freshness.ts";
import rehypeSectionFreshness from "./src/markdown/rehype-section-freshness.ts";

/** Astro entry config — content collections live in src/content.config.ts; markdown plugins extend headings with per-section freshness. */
export default defineConfig({
  site: env().SITE_URL,
  trailingSlash: "ignore",
  build: {
    // ClientRouter swaps destination <head> styles into the current document.
    // With CSP hashes, inline component styles from the destination route are
    // blocked because the initial document did not whitelist them. Keep route
    // CSS in external files so same-origin stylesheet links survive client
    // navigation under CSP.
    inlineStylesheets: "never",
  },
  integrations: [react()],
  prefetch: {
    defaultStrategy: "hover",
    prefetchAll: true,
  },
  devToolbar: {
    enabled: false,
  },
  markdown: {
    syntaxHighlight: "prism",
    processor: unified({
      remarkPlugins: [remarkSectionFreshness],
      rehypePlugins: [rehypeSectionFreshness],
    }),
  },
  security: {
    csp: {
      algorithm: "SHA-256",
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self'",
        "manifest-src 'self'",
        "worker-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests",
      ],
      styleDirective: {
        resources: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      },
      scriptDirective: {
        resources: ["'self'"],
      },
    },
  },
  vite: {
    // Production is a DO Static Site (see `.do/app.yaml`); `astro preview` is dev/Playwright-only,
    // so no `preview` block is needed here.
    ssr: {
      external: ["@resvg/resvg-js"],
    },
    build: {
      rollupOptions: {
        external: ["@resvg/resvg-js"],
      },
    },
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
});
