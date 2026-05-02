import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { z } from "zod";
import type { ProposalHandler } from "../src/lib/proposal-dispatch.ts";
import type { QueuedProposal } from "../src/lib/proposal-queue.ts";

/** Builds a minimal stub handler for the given type. */
function makeHandler(
  type: import("../src/lib/proposal-queue.ts").ProposalType,
  tag = "v1",
): ProposalHandler<{ tag: string }> {
  return {
    type,
    payloadSchema: z.object({ tag: z.string() }),
    parse: (p: QueuedProposal) => ({
      tag: String((p.payload as Record<string, unknown>)["tag"] ?? tag),
    }),
    apply: async (_proposal, _ctx) => `applied-${tag}`,
    edit: async (_proposal, _ctx) => `edited-${tag}`,
  };
}

describe("proposal-dispatch", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("registerHandler then getHandler returns the same handler", async () => {
    const { registerHandler, getHandler } = await import("../src/lib/proposal-dispatch.ts");
    const handler = makeHandler("project-flip-dormant");
    registerHandler(handler);
    expect(getHandler("project-flip-dormant")).toBe(handler);
  });

  it("registering the same handler reference twice is a no-op", async () => {
    const { registerHandler, getHandler } = await import("../src/lib/proposal-dispatch.ts");
    const h1 = makeHandler("decision-followup-due");
    registerHandler(h1);
    expect(() => registerHandler(h1)).not.toThrow();
    expect(getHandler("decision-followup-due")).toBe(h1);
  });

  it("registering the same type twice with different handlers throws", async () => {
    const { registerHandler } = await import("../src/lib/proposal-dispatch.ts");
    const h1 = makeHandler("prediction-resolve", "v1");
    const h2 = makeHandler("prediction-resolve", "v2");
    registerHandler(h1);
    expect(() => registerHandler(h2)).toThrow(/already registered/);
  });

  it("getHandler for an unknown type throws", async () => {
    const { getHandler } = await import("../src/lib/proposal-dispatch.ts");
    expect(() => getHandler("post-section-restamp")).toThrow(/no handler registered/);
  });
});
