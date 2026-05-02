#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createThinkinglabsMcpServer } from "./server.ts";

/** Resolves the repo root from CLI args or env so MCP clients can pin a checkout. */
function parseRepoRoot(argv: ReadonlyArray<string>): string {
  const idx = argv.indexOf("--repo-root");
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1]!;
  return process.env["THINKINGLABS_MCP_REPO_ROOT"] ?? process.cwd();
}

const server = createThinkinglabsMcpServer({ repoRoot: parseRepoRoot(process.argv.slice(2)) });
await server.connect(new StdioServerTransport());
