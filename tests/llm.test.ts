import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { z } from "zod";

const FAKE_KEY = "sk-test-key";

beforeEach(() => {
  process.env["OPENAI_API_KEY"] = FAKE_KEY;
  vi.resetModules();
});

afterEach(() => {
  delete process.env["OPENAI_API_KEY"];
  delete process.env["LLM_MODEL_FAST"];
  delete process.env["LLM_MODEL_BALANCED"];
  delete process.env["LLM_MODEL_DEEP"];
  vi.doUnmock("ai");
  vi.doUnmock("@ai-sdk/openai");
  vi.resetModules();
});

/** Captures every generateText call so tests can assert on the args (model, prompts, tool definitions). */
type Captured = { args: Record<string, unknown> };

/** Mocks `ai` and `@ai-sdk/openai` so runToolCall runs without network. The fake openai() factory tags the model id we can assert on. */
function mockAi(toolCallsImpl: (args: Record<string, unknown>) => Array<{ toolName: string; input: unknown }>): Captured {
  const captured: Captured = { args: {} };
  vi.doMock("ai", () => ({
    generateText: vi.fn(async (args: Record<string, unknown>) => {
      captured.args = args;
      return { toolCalls: toolCallsImpl(args) };
    }),
    tool: (def: unknown) => def,
  }));
  vi.doMock("@ai-sdk/openai", () => ({
    openai: (id: string) => ({ __mock: "openai", modelId: id }),
  }));
  return captured;
}

describe("runToolCall", () => {
  it("returns typed value when generateText returns a matching tool call", async () => {
    mockAi((args) => [{ toolName: (args["toolChoice"] as { toolName: string }).toolName, input: { score: 7, summary: "Good change." } }]);
    const { runToolCall } = await import("../src/lib/llm.ts");
    const schema = z.object({ score: z.number(), summary: z.string() });
    const result = await runToolCall({
      tier: "balanced",
      maxTokens: 256,
      systemPrompt: "You score things.",
      userPrompt: "Score this.",
      tool: { name: "score", description: "Score.", schema },
    });
    expect(result).toEqual({ score: 7, summary: "Good change." });
  });

  it("returns null when toolCalls is empty", async () => {
    mockAi(() => []);
    const { runToolCall } = await import("../src/lib/llm.ts");
    const schema = z.object({ score: z.number() });
    const result = await runToolCall({
      tier: "balanced",
      maxTokens: 256,
      systemPrompt: "sys",
      userPrompt: "usr",
      tool: { name: "t", description: "d", schema },
    });
    expect(result).toBeNull();
  });

  it("returns null when only a non-matching tool call comes back", async () => {
    mockAi(() => [{ toolName: "some_other_tool", input: { score: 5 } }]);
    const { runToolCall } = await import("../src/lib/llm.ts");
    const schema = z.object({ score: z.number() });
    const result = await runToolCall({
      tier: "balanced",
      maxTokens: 256,
      systemPrompt: "sys",
      userPrompt: "usr",
      tool: { name: "t", description: "d", schema },
    });
    expect(result).toBeNull();
  });

  it("returns null when tool input fails the caller's Zod schema", async () => {
    mockAi((args) => [{ toolName: (args["toolChoice"] as { toolName: string }).toolName, input: { wrong_field: "bad" } }]);
    const { runToolCall } = await import("../src/lib/llm.ts");
    const schema = z.object({ score: z.number() });
    const result = await runToolCall({
      tier: "balanced",
      maxTokens: 256,
      systemPrompt: "sys",
      userPrompt: "usr",
      tool: { name: "t", description: "d", schema },
    });
    expect(result).toBeNull();
  });

  it("throws when OPENAI_API_KEY is absent", async () => {
    delete process.env["OPENAI_API_KEY"];
    mockAi(() => []);
    const { runToolCall } = await import("../src/lib/llm.ts");
    const schema = z.object({ score: z.number() });
    await expect(
      runToolCall({
        tier: "balanced",
        maxTokens: 256,
        systemPrompt: "sys",
        userPrompt: "usr",
        tool: { name: "t", description: "d", schema },
      }),
    ).rejects.toThrow("OPENAI_API_KEY is not set");
  });

  it("maps tier=fast to gpt-4.1-mini by default and honors LLM_MODEL_FAST override", async () => {
    const captured = mockAi((args) => [{ toolName: (args["toolChoice"] as { toolName: string }).toolName, input: { score: 1, summary: "x" } }]);
    const schema = z.object({ score: z.number(), summary: z.string() });
    const { runToolCall } = await import("../src/lib/llm.ts");
    await runToolCall({
      tier: "fast",
      maxTokens: 64,
      systemPrompt: "sys",
      userPrompt: "usr",
      tool: { name: "t", description: "d", schema },
    });
    expect((captured.args["model"] as { modelId: string }).modelId).toBe("gpt-4.1-mini");

    process.env["LLM_MODEL_FAST"] = "gpt-4.1-nano";
    vi.resetModules();
    const captured2 = mockAi((args) => [{ toolName: (args["toolChoice"] as { toolName: string }).toolName, input: { score: 1, summary: "x" } }]);
    const { runToolCall: runToolCall2 } = await import("../src/lib/llm.ts");
    await runToolCall2({
      tier: "fast",
      maxTokens: 64,
      systemPrompt: "sys",
      userPrompt: "usr",
      tool: { name: "t", description: "d", schema },
    });
    expect((captured2.args["model"] as { modelId: string }).modelId).toBe("gpt-4.1-nano");
  });
});
