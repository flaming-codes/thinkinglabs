import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { createThinkinglabsMcpServer } from "../thinkinglabs-mcp/server.ts";
import { createTokenBucket, type TokenBucket } from "./rate-limit.ts";

/** Configurable bits of the remote MCP HTTP server. Most fields fall back to safe defaults. */
export interface McpHttpServerOptions {
  /** Repo root passed through to the underlying MCP server factory. */
  readonly repoRoot: string;
  /** Bind address. Default `127.0.0.1` (loopback) — set to `0.0.0.0` only behind a known proxy. */
  readonly host?: string;
  /** TCP port. Default `8787`. */
  readonly port?: number;
  /** URL path the MCP endpoint lives at. Default `/mcp`. */
  readonly path?: string;
  /** Hostnames allowed in the `Host` header (DNS-rebinding protection). Empty means accept all. */
  readonly allowedHosts?: ReadonlyArray<string>;
  /** Origins allowed for CORS and DNS-rebinding protection. Empty means accept all. */
  readonly allowedOrigins?: ReadonlyArray<string>;
  /** Rate-limit knobs: `capacity` is the burst, `refillPerSecond` is steady-state RPS per IP. */
  readonly rateLimit?: { readonly capacity: number; readonly refillPerSecond: number };
  /** Trust `X-Forwarded-For` when computing the rate-limit key. Only enable behind a known proxy. */
  readonly trustForwardedFor?: boolean;
}

/** Started HTTP MCP server with a stable shutdown handle. */
export interface McpHttpServerHandle {
  readonly server: Server;
  readonly url: string;
  readonly close: () => Promise<void>;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;
const DEFAULT_PATH = "/mcp";
const MAX_BODY_BYTES = 1 << 20;
const REQUEST_TIMEOUT_MS = 30_000;

/** Build and start a stateless Streamable-HTTP MCP server. */
export async function startMcpHttpServer(
  options: McpHttpServerOptions,
): Promise<McpHttpServerHandle> {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const path = options.path ?? DEFAULT_PATH;
  const allowedHosts = (options.allowedHosts ?? []).filter((h) => h.length > 0);
  const allowedOrigins = (options.allowedOrigins ?? []).filter((o) => o.length > 0);
  const rateLimit = options.rateLimit ?? { capacity: 30, refillPerSecond: 1 };
  const bucket = createTokenBucket(rateLimit);

  const httpServer = createServer((req, res) => {
    handle(req, res, {
      repoRoot: options.repoRoot,
      path,
      allowedHosts,
      allowedOrigins,
      bucket,
      trustForwardedFor: options.trustForwardedFor === true,
    }).catch((error) => {
      if (!res.headersSent) {
        sendJsonRpcError(res, 500, "internal error", error);
      } else {
        try {
          res.end();
        } catch {
          /* socket already torn down */
        }
      }
    });
  });

  httpServer.on("clientError", (_err, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
  });

  httpServer.requestTimeout = REQUEST_TIMEOUT_MS;

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  return {
    server: httpServer,
    url: `http://${host}:${port}${path}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        bucket.destroy();
        httpServer.closeAllConnections();
        httpServer.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

interface HandleContext {
  readonly repoRoot: string;
  readonly path: string;
  readonly allowedHosts: ReadonlyArray<string>;
  readonly allowedOrigins: ReadonlyArray<string>;
  readonly bucket: TokenBucket;
  readonly trustForwardedFor: boolean;
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: HandleContext,
): Promise<void> {
  applyCorsHeaders(res, req, ctx.allowedOrigins);

  if (ctx.allowedHosts.length > 0) {
    const host = (headerString(req, "host") ?? "").split(":")[0] ?? "";
    if (!ctx.allowedHosts.includes(host)) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "forbidden" }));
      return;
    }
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (url.pathname !== ctx.path) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
    return;
  }

  if (req.method === "GET" || req.method === "DELETE") {
    res.setHeader("allow", "POST, OPTIONS");
    sendJsonRpcError(res, 405, "method not allowed");
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("allow", "POST, OPTIONS");
    sendJsonRpcError(res, 405, "method not allowed");
    return;
  }

  const rateKey = clientKey(req, ctx.trustForwardedFor);
  if (!ctx.bucket.consume(rateKey)) {
    res.setHeader("retry-after", "1");
    sendJsonRpcError(res, 429, "rate limit exceeded");
    return;
  }

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJsonRpcError(res, 400, error instanceof Error ? error.message : "invalid body");
    return;
  }

  /** Omit `sessionIdGenerator` to enable stateless mode and satisfy exact optional types. */
  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: true,
    enableDnsRebindingProtection: ctx.allowedHosts.length > 0 || ctx.allowedOrigins.length > 0,
    allowedHosts: ctx.allowedHosts as string[],
    allowedOrigins: ctx.allowedOrigins as string[],
  });
  const server = createThinkinglabsMcpServer({ repoRoot: ctx.repoRoot });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  /** Cast through `Transport` because the SDK getter can return `undefined`. */
  await server.connect(transport as unknown as Transport);
  await transport.handleRequest(req, res, body);
}

function applyCorsHeaders(
  res: ServerResponse,
  req: IncomingMessage,
  allowedOrigins: ReadonlyArray<string>,
): void {
  const origin = headerString(req, "origin");
  const allowed =
    allowedOrigins.length === 0 || (origin !== undefined && allowedOrigins.includes(origin));
  if (allowed) {
    if (allowedOrigins.length === 0) {
      res.setHeader("access-control-allow-origin", "*");
    } else {
      res.setHeader("access-control-allow-origin", origin ?? "*");
      res.setHeader("vary", "origin");
    }
  }
  res.setHeader("access-control-allow-methods", "POST, OPTIONS");
  res.setHeader(
    "access-control-allow-headers",
    "content-type, mcp-session-id, mcp-protocol-version",
  );
  res.setHeader("access-control-expose-headers", "mcp-session-id, mcp-protocol-version");
  res.setHeader("access-control-max-age", "600");
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const contentLengthHeader = headerString(req, "content-length");
  if (contentLengthHeader !== undefined) {
    const declared = Number(contentLengthHeader);
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      throw new Error("payload too large");
    }
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as ArrayBuffer | SharedArrayBuffer);
    total += buf.byteLength;
    if (total > MAX_BODY_BYTES) throw new Error("payload too large");
    chunks.push(buf);
  }
  if (total === 0) return undefined;
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("invalid json");
  }
}

function clientKey(req: IncomingMessage, trustForwardedFor: boolean): string {
  if (trustForwardedFor) {
    const forwarded = headerString(req, "x-forwarded-for");
    if (forwarded !== undefined && forwarded.length > 0) {
      const first = forwarded.split(",")[0]?.trim();
      if (first !== undefined && first.length > 0) return first;
    }
  }
  return req.socket.remoteAddress ?? "unknown";
}

function headerString(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers[name];
  if (raw === undefined) return undefined;
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function sendJsonRpcError(
  res: ServerResponse,
  status: number,
  message: string,
  cause?: unknown,
): void {
  if (res.headersSent) return;
  res.writeHead(status, { "content-type": "application/json" });
  const code = status === 429 ? -32029 : status === 405 ? -32000 : -32603;
  const detail = cause instanceof Error ? cause.message : undefined;
  res.end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code, message, ...(detail ? { data: detail } : {}) },
      id: null,
    }),
  );
}
