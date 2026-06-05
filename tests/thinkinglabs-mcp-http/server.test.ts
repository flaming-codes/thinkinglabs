import type { AddressInfo } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  startMcpHttpServer,
  type McpHttpServerHandle,
  type McpHttpServerOptions,
} from "../../servers/thinkinglabs-mcp-http/server.ts";

// These tests bind a real HTTP server on an ephemeral loopback port (port 0) and make
// real fetch requests. Everything stays on 127.0.0.1, so the suite is hermetic with no
// external network access. Each test closes its server in afterEach.

let root: string;
let handle: McpHttpServerHandle | undefined;

// The negotiated protocol version the SDK advertises; kept loose so a bump does not break tests.
const PROTOCOL_VERSION = "2025-06-18";

function origin(h: McpHttpServerHandle): string {
  const address = h.server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function start(options?: Partial<McpHttpServerOptions>): Promise<McpHttpServerHandle> {
  handle = await startMcpHttpServer({
    repoRoot: root,
    host: "127.0.0.1",
    port: 0,
    ...options,
  });
  return handle;
}

function initializeBody(): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "test-client", version: "0.0.0" },
    },
  });
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "thinkinglabs-mcp-http-"));
});

afterEach(async () => {
  if (handle) {
    await handle.close();
    handle = undefined;
  }
  rmSync(root, { recursive: true, force: true });
});

describe("startMcpHttpServer", () => {
  it("answers the /healthz probe with 200 and a JSON status", async () => {
    const h = await start();
    const res = await fetch(`${origin(h)}/healthz`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("rejects GET on the MCP path with 405 and an Allow header", async () => {
    const h = await start();
    const res = await fetch(`${origin(h)}/mcp`, { method: "GET" });
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST, OPTIONS");
    const body = (await res.json()) as { error: { code: number; message: string } };
    expect(body.error.code).toBe(-32000);
    expect(body.error.message).toBe("method not allowed");
  });

  it("rejects DELETE on the MCP path with 405", async () => {
    const h = await start();
    const res = await fetch(`${origin(h)}/mcp`, { method: "DELETE" });
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST, OPTIONS");
  });

  it("returns 404 for unknown paths", async () => {
    const h = await start();
    const res = await fetch(`${origin(h)}/nope`, { method: "POST" });
    expect(res.status).toBe(404);
    expect((await res.json()) as { error: string }).toEqual({ error: "not found" });
  });

  it("answers an OPTIONS preflight with 204 and CORS headers", async () => {
    const h = await start();
    const res = await fetch(`${origin(h)}/mcp`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
    // No allowlist configured, so CORS is fully open.
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("completes an initialize POST and returns the server info as JSON", async () => {
    const h = await start();
    const res = await fetch(`${origin(h)}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: initializeBody(),
    });
    expect(res.status).toBe(200);
    const payload = (await res.json()) as {
      jsonrpc: string;
      id: number;
      result: { protocolVersion: string; serverInfo: { name: string } };
    };
    expect(payload.jsonrpc).toBe("2.0");
    expect(payload.id).toBe(1);
    expect(payload.result.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(typeof payload.result.serverInfo.name).toBe("string");
  });

  it("rejects a body whose Content-Length exceeds the 1 MiB cap with 400", async () => {
    const h = await start();
    // Declare an oversized Content-Length; the server short-circuits before reading the stream.
    const res = await fetch(`${origin(h)}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String((1 << 20) + 1),
      },
      body: "x".repeat((1 << 20) + 1),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("payload too large");
  });

  it("rejects an oversized streamed body with no Content-Length via the byte counter", async () => {
    const h = await start();
    // A ReadableStream body has no Content-Length, so the Content-Length short-circuit is skipped
    // and the per-chunk byte counter in readJsonBody is what must reject the request.
    const chunk = "a".repeat(256 * 1024);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        // ~1.25 MiB total, above the 1 MiB cap.
        for (let i = 0; i < 5; i++) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
    const res = await fetch(`${origin(h)}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      // Node's fetch requires duplex for a streaming request body.
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    expect(res.status).toBe(400);
    expect((await res.json()) as { error: { message: string } }).toMatchObject({
      error: { message: "payload too large" },
    });
  });

  it("returns a 400 JSON-RPC error for an unparseable JSON body", async () => {
    const h = await start();
    const res = await fetch(`${origin(h)}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not json",
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("invalid json");
  });

  it("throttles with 429 once the per-IP burst is exhausted", async () => {
    const h = await start({ rateLimit: { capacity: 2, refillPerSecond: 0 } });
    const post = () =>
      fetch(`${origin(h)}/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: initializeBody(),
      });
    // Two requests consume the burst; the third is rate-limited.
    const first = await post();
    expect(first.status).toBe(200);
    await first.body?.cancel();
    const second = await post();
    expect(second.status).toBe(200);
    await second.body?.cancel();
    const third = await post();
    expect(third.status).toBe(429);
    expect(third.headers.get("retry-after")).toBe("1");
    const body = (await third.json()) as { error: { code: number; message: string } };
    expect(body.error.code).toBe(-32029);
    expect(body.error.message).toBe("rate limit exceeded");
  });

  it("returns 403 when the Host header is not in the allowlist", async () => {
    const h = await start({ allowedHosts: ["mcp.example.com"] });
    // fetch sets Host from the URL authority (127.0.0.1:port), which is not allowed.
    const res = await fetch(`${origin(h)}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: initializeBody(),
    });
    expect(res.status).toBe(403);
    expect((await res.json()) as { error: string }).toEqual({ error: "forbidden" });
  });

  it("accepts a request whose Host matches the allowlist (port stripped)", async () => {
    // The handler strips the port before matching, so allowing "127.0.0.1" admits 127.0.0.1:<port>.
    const h = await start({ allowedHosts: ["127.0.0.1"] });
    const res = await fetch(`${origin(h)}/healthz`);
    expect(res.status).toBe(200);
  });

  it("reflects an allowed Origin and sets Vary when an origin allowlist is configured", async () => {
    const h = await start({ allowedOrigins: ["https://app.example.com"] });
    const res = await fetch(`${origin(h)}/mcp`, {
      method: "OPTIONS",
      headers: { origin: "https://app.example.com" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
    expect(res.headers.get("vary")).toBe("origin");
  });

  it("does not echo a disallowed Origin in the CORS header", async () => {
    const h = await start({ allowedOrigins: ["https://app.example.com"] });
    const res = await fetch(`${origin(h)}/mcp`, {
      method: "OPTIONS",
      headers: { origin: "https://evil.example.com" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
