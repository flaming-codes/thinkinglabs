#!/usr/bin/env tsx
import { apiKeyName, isLLMAvailable } from "../src/lib/llm.ts";

const key = apiKeyName();

if (!isLLMAvailable()) {
  process.stderr.write(
    `${key} is not set; refusing to generate scored brain-diff feeds. Set ${key} or use \`pnpm brain-diff:offline\` / \`pnpm artifacts\`.\n`,
  );
  process.exit(1);
}

process.stdout.write(`${key} is set; scored brain-diff generation can run.\n`);
