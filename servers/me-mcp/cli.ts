#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMeMcpServer } from "./server.ts";

function parseRepoRoot(argv: ReadonlyArray<string>): string {
  const idx = argv.indexOf("--repo-root");
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1]!;
  return process.env["ME_MCP_REPO_ROOT"] ?? process.cwd();
}

const server = createMeMcpServer({ repoRoot: parseRepoRoot(process.argv.slice(2)) });
await server.connect(new StdioServerTransport());
