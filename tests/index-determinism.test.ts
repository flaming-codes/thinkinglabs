import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vite-plus/test";
import { collectObjects, writeIndex } from "../src/index/builder.ts";
import { KINDS } from "../src/schemas/index.ts";

/** A determinism check is the only thing that catches accidental nondeterminism (Date.now, hash randomness, fs ordering). */
function buildOnce(contentRoot: string, repoRoot: string, outFile: string): Buffer {
  const objects = collectObjects(contentRoot, repoRoot);
  writeIndex(objects, outFile);
  return readFileSync(outFile);
}

describe("index builder", () => {
  it("produces byte-identical output for the same content twice", () => {
    const root = mkdtempSync(join(tmpdir(), "me-index-"));
    try {
      const content = join(root, "content");
      for (const k of KINDS) {
        mkdirSync(join(content, k), { recursive: true });
      }
      writeFileSync(
        join(content, "thoughts", "alpha.md"),
        `---\ntitle: Alpha\ncreated: 2026-04-01\nupdated: 2026-04-02\ntags: [x, y]\nclaims: [claims/c-one]\n---\nBody alpha.\n`,
      );
      writeFileSync(
        join(content, "claims", "c-one.md"),
        `---\nclaim: A claim\nconfidence: 0.5\nlast_reviewed: 2026-04-10\nderived_from: [thoughts/alpha]\ntags: [a]\n---\nBody.\n`,
      );
      const out1 = join(root, "dist1.sqlite");
      const out2 = join(root, "dist2.sqlite");
      const buf1 = buildOnce(content, root, out1);
      const buf2 = buildOnce(content, root, out2);
      expect(buf1.equals(buf2)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);

  it("surfaces malformed frontmatter with kind/slug and relative path", () => {
    const root = mkdtempSync(join(tmpdir(), "me-index-"));
    try {
      const content = join(root, "content");
      for (const k of KINDS) {
        mkdirSync(join(content, k), { recursive: true });
      }
      writeFileSync(
        join(content, "posts", "broken.md"),
        ["---", "title: *missing", "---", "Body."].join("\n"),
      );
      const run = () => collectObjects(content, root);
      expect(run).toThrow(/posts\/broken/);
      expect(run).toThrow(/content\/posts\/broken\.md/);
      expect(run).toThrow(/frontmatter parse error/);
      expect(run).toThrow(/Fix the YAML between the leading and trailing --- delimiters/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("stores derived word and approximate token counts", () => {
    const root = mkdtempSync(join(tmpdir(), "me-index-"));
    try {
      const content = join(root, "content");
      for (const k of KINDS) {
        mkdirSync(join(content, k), { recursive: true });
      }
      writeFileSync(
        join(content, "thoughts", "alpha.md"),
        `---\ntitle: Alpha\ncreated: 2026-04-01\nupdated: 2026-04-02\ntags: []\nclaims: []\ninputs: []\n---\nBody alpha with several words.\n`,
      );
      const out = join(root, "dist.sqlite");
      writeIndex(collectObjects(content, root), out);
      const db = Database(out, { readonly: true, fileMustExist: true });
      try {
        const row = db
          .prepare("SELECT word_count, approx_token_count FROM objects WHERE id = ?")
          .get("thoughts/alpha") as
          | { readonly word_count: number; readonly approx_token_count: number }
          | undefined;
        expect(row?.word_count).toBeGreaterThan(0);
        expect(row?.approx_token_count).toBeGreaterThan(0);
      } finally {
        db.close();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
