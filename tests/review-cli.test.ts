import { PassThrough } from "node:stream";
import { describe, expect, it } from "vite-plus/test";
import { runReview, type ReviewActionDef, type ReviewProposal } from "../src/lib/review-cli.ts";

function makeProposal(id: string): ReviewProposal<string> {
  return { id, title: `Title ${id}`, preview: `Preview ${id}`, payload: `payload-${id}` };
}

function makeActions(): ReviewActionDef<string, string>[] {
  return [
    { key: "a", label: "accept", handle: (p) => `accepted:${p}` },
    { key: "r", label: "reject", handle: (p) => `rejected:${p}` },
  ];
}

function makeIO(keys: string): { input: PassThrough; output: PassThrough } {
  const input = new PassThrough();
  const output = new PassThrough();
  for (const key of keys) {
    setTimeout(() => input.write(key), 0);
  }
  return { input, output };
}

describe("runReview", () => {
  it("returns empty results for empty proposals", async () => {
    const results = await runReview([], makeActions());
    expect(results).toEqual([]);
  });

  it("dispatches handlers in proposal order", async () => {
    const proposals = [makeProposal("1"), makeProposal("2")];
    const io = makeIO("ar");
    const results = await runReview(proposals, makeActions(), io);
    expect(results).toEqual(["accepted:payload-1", "rejected:payload-2"]);
  });

  it("re-prompts on unrecognized key then accepts on valid key", async () => {
    const proposals = [makeProposal("1")];
    const output = new PassThrough();
    const input = new PassThrough();
    const chunks: string[] = [];
    output.on("data", (d: Buffer) => chunks.push(d.toString()));

    setTimeout(() => {
      input.write("x");
      setTimeout(() => input.write("a"), 10);
    }, 0);

    const results = await runReview(proposals, makeActions(), { input, output });
    expect(results).toEqual(["accepted:payload-1"]);
    const combined = chunks.join("");
    expect(combined).toContain("Unrecognized key");
  });

  it("custom IO streams are used instead of process stdio", async () => {
    const proposals = [makeProposal("z")];
    const io = makeIO("r");
    const chunks: string[] = [];
    io.output.on("data", (d: Buffer) => chunks.push(d.toString()));
    const results = await runReview(proposals, makeActions(), io);
    expect(results).toEqual(["rejected:payload-z"]);
    expect(chunks.join("")).toContain("Title z");
  });
});
