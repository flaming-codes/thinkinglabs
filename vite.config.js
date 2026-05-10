import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [".claude/settings.json", ".harness/manifest.lock.json"],
  },
  test: {
    globalSetup: ["./tests/global-setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
  },
  staged: {
    "*": "vp check --fix",
  },
});
