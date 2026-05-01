import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vite-plus/test";
import { readJsonState, writeJsonState } from "../src/lib/json-state.ts";

let tmpDir: string | null = null;

afterEach(() => {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  }
});

/** Returns a path inside a fresh temp directory. */
function tmpFile(name: string): string {
  tmpDir = tmpDir ?? mkdtempSync(join(tmpdir(), "json-state-test-"));
  return join(tmpDir, name);
}

describe("readJsonState", () => {
  it("returns the fallback when the file does not exist", () => {
    const result = readJsonState(tmpFile("missing.json"), { default: true });
    expect(result).toEqual({ default: true });
  });

  it("returns parsed content for a valid JSON file", () => {
    const path = tmpFile("state.json");
    writeJsonState(path, { count: 42 });
    expect(readJsonState(path, {})).toEqual({ count: 42 });
  });

  it("returns the fallback for a malformed JSON file without throwing", () => {
    const path = tmpFile("bad.json");
    const { writeFileSync } = require("node:fs") as typeof import("node:fs");
    writeFileSync(path, "{ not valid json", "utf8");
    expect(() => readJsonState(path, ["fallback"])).not.toThrow();
    expect(readJsonState(path, ["fallback"])).toEqual(["fallback"]);
  });
});

describe("writeJsonState + readJsonState round-trip", () => {
  it("persists and retrieves an object", () => {
    const path = tmpFile("round-trip.json");
    const data = { slugs: ["a", "b"], count: 2 };
    writeJsonState(path, data);
    expect(readJsonState(path, {})).toEqual(data);
  });

  it("pretty-prints with 2-space indent for git-friendly diffs", () => {
    const path = tmpFile("pretty.json");
    writeJsonState(path, { key: "value" });
    const raw = readFileSync(path, "utf8");
    expect(raw).toBe('{\n  "key": "value"\n}\n');
  });
});
