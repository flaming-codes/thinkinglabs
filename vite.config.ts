import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    globalSetup: ["./tests/global-setup.ts"],
  },
  staged: {
    "*": "vp check --fix",
  },
});
