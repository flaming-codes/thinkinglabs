#!/usr/bin/env node
import { env } from "../../src/lib/env.ts";
import { startMcpHttpServer } from "./server.ts";

/** Parse `--flag value` pairs out of `argv`. */
function flag(argv: ReadonlyArray<string>, name: string): string | undefined {
  const idx = argv.indexOf(`--${name}`);
  if (idx >= 0 && argv[idx + 1] !== undefined) return argv[idx + 1];
  return undefined;
}

const argv = process.argv.slice(2);
const config = env();

const repoRoot = flag(argv, "repo-root") ?? config.THINKINGLABS_MCP_REPO_ROOT ?? process.cwd();
const host = flag(argv, "host") ?? config.MCP_HTTP_HOST ?? "127.0.0.1";
const portFlag = flag(argv, "port");
const port = portFlag !== undefined ? Number(portFlag) : (config.MCP_HTTP_PORT ?? 8787);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`mcp-http: invalid port ${portFlag ?? port}`);
}

const allowedHosts = splitList(config.MCP_HTTP_ALLOWED_HOSTS);
const allowedOrigins = splitList(config.MCP_HTTP_ALLOWED_ORIGINS);
const trustForwardedFor = config.MCP_HTTP_TRUST_PROXY === "1";

let handle;
try {
  handle = await startMcpHttpServer({
    repoRoot,
    host,
    port,
    allowedHosts,
    allowedOrigins,
    trustForwardedFor,
  });
} catch (err) {
  process.stderr.write(`mcp-http: failed to start: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
}

process.stderr.write(`mcp-http: listening on ${handle.url}\n`);

const shutdown = (signal: NodeJS.Signals) => {
  process.stderr.write(`mcp-http: ${signal}, closing\n`);
  handle.close().then(
    () => process.exit(0),
    (err) => {
      process.stderr.write(`mcp-http: close failed: ${err}\n`);
      process.exit(1);
    },
  );
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function splitList(value: string | undefined): string[] {
  if (value === undefined || value.length === 0) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
