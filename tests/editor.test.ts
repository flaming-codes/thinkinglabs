import { describe, expect, it } from "vitest";
import { editInEditor } from "../src/lib/editor.ts";

describe("editInEditor", () => {
  it("returns unchanged content when EDITOR=cat (no-op edit)", async () => {
    /** cat reads the file and prints it unchanged; the result should match initial. */
    const prev = process.env["EDITOR"];
    process.env["EDITOR"] = "cat";
    try {
      const result = await editInEditor("hello world\n", ".txt");
      expect(result).toBe("hello world\n");
    } finally {
      if (prev === undefined) delete process.env["EDITOR"];
      else process.env["EDITOR"] = prev;
    }
  });

  it("throws when editor exits non-zero", async () => {
    /** Exercises the non-zero exit guard; `false` always exits 1. */
    const prev = process.env["EDITOR"];
    process.env["EDITOR"] = "false";
    try {
      await expect(editInEditor("content")).rejects.toThrow();
    } finally {
      if (prev === undefined) delete process.env["EDITOR"];
      else process.env["EDITOR"] = prev;
    }
  });
});
