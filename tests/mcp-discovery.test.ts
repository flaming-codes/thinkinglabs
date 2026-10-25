import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

describe("MCP discovery manifests", () => {
  const root = process.cwd();
  const mcpJsonPath = resolve(root, "public/.well-known/mcp.json");
  const serverCardPath = resolve(root, "public/.well-known/mcp/server-card.json");

  it("exposes both standard discovery paths", () => {
    expect(existsSync(mcpJsonPath)).toBe(true);
    expect(existsSync(serverCardPath)).toBe(true);
  });

  it("defines valid server info, transport, and capabilities", () => {
    const raw = readFileSync(mcpJsonPath, "utf8");
    const manifest = JSON.parse(raw);

    expect(manifest.serverInfo?.name).toBe("thinkinglabs-mcp");
    expect(manifest.transport?.type).toBe("streamable_http");
    expect(manifest.transport?.endpoint).toBe("https://mcp.thinkinglabs.run/mcp");
    expect(manifest.capabilities?.tools).toBe(true);
    expect(manifest.capabilities?.resources).toBe(true);
    expect(Array.isArray(manifest.tools)).toBe(true);
    expect(manifest.tools.length).toBeGreaterThan(0);
    expect(Array.isArray(manifest.resources)).toBe(true);
    expect(manifest.resources.length).toBeGreaterThan(0);

    const cardRaw = readFileSync(serverCardPath, "utf8");
    expect(JSON.parse(cardRaw)).toEqual(manifest);
  });
});
