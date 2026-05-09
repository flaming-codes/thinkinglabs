import { defineConfig } from "vite-plus";

export default defineConfig({
  preview: {
    allowedHosts: ["thinkinglabs.run"],
  },
  test: {
    globalSetup: ["./tests/global-setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
  },
  staged: {
    "*": "vp check --fix",
  },
});
