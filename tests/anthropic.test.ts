import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { z } from "zod";

/** Fake key used so the env check in runToolCall passes; the SDK itself is mocked. */
const FAKE_KEY = "sk-ant-test-key";

beforeEach(() => {
  process.env["ANTHROPIC_API_KEY"] = FAKE_KEY;
  vi.resetModules();
});

afterEach(() => {
  delete process.env["ANTHROPIC_API_KEY"];
  vi.doUnmock("@anthropic-ai/sdk");
  vi.resetModules();
});

/** Helper: mock the SDK module and reset the module cache so the lazy singleton is cleared between tests. */
function mockSdkCreate(createImpl: (args: unknown) => Promise<unknown>): void {
  vi.doMock("@anthropic-ai/sdk", () => ({
    default: class {
      messages = { create: createImpl };
    },
  }));
}

describe("runToolCall", () => {
  it("returns typed value when the model emits a tool_use block that passes Zod", async () => {
    mockSdkCreate(async () => ({
      content: [{ type: "tool_use", input: { score: 7, summary: "Good change." } }],
    }));
    const { runToolCall } = await import("../src/lib/anthropic.ts");
    const schema = z.object({ score: z.number(), summary: z.string() });
    const result = await runToolCall({
      model: "claude-sonnet-4-6",
      maxTokens: 256,
      systemPrompt: "You score things.",
      userPrompt: "Score this.",
      tool: { name: "score", description: "Score.", input_schema: { type: "object", properties: {}, required: [] } },
      schema,
    });
    expect(result).toEqual({ score: 7, summary: "Good change." });
  });

  it("returns null when the model emits an empty content array", async () => {
    mockSdkCreate(async () => ({ content: [] }));
    const { runToolCall } = await import("../src/lib/anthropic.ts");
    const schema = z.object({ score: z.number() });
    const result = await runToolCall({
      model: "claude-sonnet-4-6",
      maxTokens: 256,
      systemPrompt: "sys",
      userPrompt: "usr",
      tool: { name: "t", description: "d", input_schema: {} },
      schema,
    });
    expect(result).toBeNull();
  });

  it("returns null when the model emits only a text block (no tool_use)", async () => {
    mockSdkCreate(async () => ({
      content: [{ type: "text", text: "I cannot call the tool." }],
    }));
    const { runToolCall } = await import("../src/lib/anthropic.ts");
    const schema = z.object({ score: z.number() });
    const result = await runToolCall({
      model: "claude-sonnet-4-6",
      maxTokens: 256,
      systemPrompt: "sys",
      userPrompt: "usr",
      tool: { name: "t", description: "d", input_schema: {} },
      schema,
    });
    expect(result).toBeNull();
  });

  it("returns null when tool_use input fails Zod validation", async () => {
    mockSdkCreate(async () => ({
      content: [{ type: "tool_use", input: { wrong_field: "bad" } }],
    }));
    const { runToolCall } = await import("../src/lib/anthropic.ts");
    const schema = z.object({ score: z.number() });
    const result = await runToolCall({
      model: "claude-sonnet-4-6",
      maxTokens: 256,
      systemPrompt: "sys",
      userPrompt: "usr",
      tool: { name: "t", description: "d", input_schema: {} },
      schema,
    });
    expect(result).toBeNull();
  });

  it("throws when ANTHROPIC_API_KEY is absent on first call", async () => {
    delete process.env["ANTHROPIC_API_KEY"];
    const { runToolCall } = await import("../src/lib/anthropic.ts");
    const schema = z.object({ score: z.number() });
    await expect(
      runToolCall({
        model: "claude-sonnet-4-6",
        maxTokens: 256,
        systemPrompt: "sys",
        userPrompt: "usr",
        tool: { name: "t", description: "d", input_schema: {} },
        schema,
      }),
    ).rejects.toThrow("ANTHROPIC_API_KEY is not set");
  });

  it("sets cache_control ephemeral on the system prompt block", async () => {
    const calls: unknown[] = [];
    mockSdkCreate(async (args: unknown) => {
      calls.push(args);
      return { content: [{ type: "tool_use", input: { score: 5, summary: "ok" } }] };
    });
    const { runToolCall } = await import("../src/lib/anthropic.ts");
    const schema = z.object({ score: z.number(), summary: z.string() });
    await runToolCall({
      model: "claude-sonnet-4-6",
      maxTokens: 256,
      systemPrompt: "My system prompt.",
      userPrompt: "Do the thing.",
      tool: { name: "t", description: "d", input_schema: {} },
      schema,
    });
    const call = calls[0] as { system: Array<{ type: string; text: string; cache_control: { type: string } }> };
    expect(call.system[0]?.cache_control).toEqual({ type: "ephemeral" });
    expect(call.system[0]?.text).toBe("My system prompt.");
  });
});
