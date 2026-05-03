#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { env } from "../../src/lib/env.ts";
import { createThinkinglabsMcpServer } from "./server.ts";

/** Resolves the repo root from CLI args or the validated env so MCP clients can pin a checkout. */
function parseRepoRoot(argv: ReadonlyArray<string>): string {
  const idx = argv.indexOf("--repo-root");
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1]!;
  return env().THINKINGLABS_MCP_REPO_ROOT ?? process.cwd();
}

const server = createThinkinglabsMcpServer({ repoRoot: parseRepoRoot(process.argv.slice(2)) });
await server.connect(new StdioServerTransport());
