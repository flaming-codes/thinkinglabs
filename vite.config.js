import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    globalSetup: ["./tests/global-setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
  },
  staged: {
    "*": "vp check --fix",
  },
});
