import { describe, expect, it, vi, afterEach, beforeEach } from "vite-plus/test";
import { z } from "zod";

const FAKE_OPENAI_KEY = "sk-openai-test";
const FAKE_OLLAMA_KEY = "ollama-test-key";

beforeEach(() => {
  process.env["OPENAI_API_KEY"] = FAKE_OPENAI_KEY;
  vi.resetModules();
});

afterEach(() => {
  delete process.env["OPENAI_API_KEY"];
  delete process.env["OLLAMA_API_KEY"];
  delete process.env["LLM_PROVIDER"];
  delete process.env["LLM_MODEL_FAST"];
  delete process.env["LLM_MODEL_BALANCED"];
  delete process.env["LLM_MODEL_DEEP"];
  delete process.env["OLLAMA_BASE_URL"];
  vi.doUnmock("ai");
  vi.doUnmock("@ai-sdk/openai");
  vi.resetModules();
});

type Captured = { args: Record<string, unknown> };

/** Mocks `ai` and `@ai-sdk/openai` (both the openai singleton and createOpenAI for Ollama). */
function mockAi(
  toolCallsImpl: (args: Record<string, unknown>) => Array<{ toolName: string; input: unknown }>,
): Captured {
  const captured: Captured = { args: {} };
  vi.doMock("ai", () => ({
    generateText: vi.fn(async (args: Record<string, unknown>) => {
      captured.args = args;
      return { toolCalls: toolCallsImpl(args) };
    }),
    tool: (def: unknown) => def,
  }));
  vi.doMock("@ai-sdk/openai", () => ({
    openai: (id: string) => ({ __provider: "openai", modelId: id }),
    createOpenAI: (opts: { baseURL?: string; apiKey?: string }) => (id: string) => ({
      __provider: "ollama",
      modelId: id,
      baseURL: opts?.baseURL,
    }),
  }));
  return captured;
}

describe("runToolCall — OpenAI provider (default)", () => {
  it("returns typed value when generateText returns a matching tool call", async () => {
    mockAi((args) => [
      {
        toolName: (args["toolChoice"] as { toolName: string }).toolName,
        input: { score: 7, summary: "Good change." },
      },
    ]);
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
    expect(
      await runToolCall({
        tier: "balanced",
        maxTokens: 256,
        systemPrompt: "sys",
        userPrompt: "usr",
        tool: { name: "t", description: "d", schema },
      }),
    ).toBeNull();
  });

  it("returns null when only a non-matching tool call comes back", async () => {
    mockAi(() => [{ toolName: "other_tool", input: {} }]);
    const { runToolCall } = await import("../src/lib/llm.ts");
    const schema = z.object({ score: z.number() });
    expect(
      await runToolCall({
        tier: "balanced",
        maxTokens: 256,
        systemPrompt: "sys",
        userPrompt: "usr",
        tool: { name: "t", description: "d", schema },
      }),
    ).toBeNull();
  });

  it("returns null when tool input fails the caller's Zod schema", async () => {
    mockAi((args) => [
      { toolName: (args["toolChoice"] as { toolName: string }).toolName, input: { wrong: "bad" } },
    ]);
    const { runToolCall } = await import("../src/lib/llm.ts");
    const schema = z.object({ score: z.number() });
    expect(
      await runToolCall({
        tier: "balanced",
        maxTokens: 256,
        systemPrompt: "sys",
        userPrompt: "usr",
        tool: { name: "t", description: "d", schema },
      }),
    ).toBeNull();
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

  it("maps tier=fast to gpt-4.1-mini by default; honors LLM_MODEL_FAST override", async () => {
    const captured = mockAi((args) => [
      {
        toolName: (args["toolChoice"] as { toolName: string }).toolName,
        input: { score: 1, summary: "x" },
      },
    ]);
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
    const captured2 = mockAi((args) => [
      {
        toolName: (args["toolChoice"] as { toolName: string }).toolName,
        input: { score: 1, summary: "x" },
      },
    ]);
    const { runToolCall: rc2 } = await import("../src/lib/llm.ts");
    await rc2({
      tier: "fast",
      maxTokens: 64,
      systemPrompt: "sys",
      userPrompt: "usr",
      tool: { name: "t", description: "d", schema },
    });
    expect((captured2.args["model"] as { modelId: string }).modelId).toBe("gpt-4.1-nano");
  });

  it("apiKeyName() returns OPENAI_API_KEY; isLLMAvailable() reflects key presence", async () => {
    const { apiKeyName, isLLMAvailable } = await import("../src/lib/llm.ts");
    expect(apiKeyName()).toBe("OPENAI_API_KEY");
    expect(isLLMAvailable()).toBe(true);
    delete process.env["OPENAI_API_KEY"];
    // isLLMAvailable reads live env — module re-import not needed since it checks process.env at call time
    // (PROVIDER is fixed but apiKeyName() is evaluated at call time)
    expect(isLLMAvailable()).toBe(false);
  });
});

describe("runToolCall — Ollama provider (LLM_PROVIDER=ollama)", () => {
  beforeEach(() => {
    delete process.env["OPENAI_API_KEY"];
    process.env["LLM_PROVIDER"] = "ollama";
    process.env["OLLAMA_API_KEY"] = FAKE_OLLAMA_KEY;
    vi.resetModules();
  });

  it("uses ollamaProvider (createOpenAI) with glm-5.1:cloud for all tiers by default", async () => {
    for (const tier of ["fast", "balanced", "deep"] as const) {
      vi.resetModules();
      const captured = mockAi((args) => [
        {
          toolName: (args["toolChoice"] as { toolName: string }).toolName,
          input: { score: 5, summary: "ok" },
        },
      ]);
      const { runToolCall } = await import("../src/lib/llm.ts");
      const schema = z.object({ score: z.number(), summary: z.string() });
      await runToolCall({
        tier,
        maxTokens: 64,
        systemPrompt: "sys",
        userPrompt: "usr",
        tool: { name: "t", description: "d", schema },
      });
      const model = captured.args["model"] as { __provider: string; modelId: string };
      expect(model.__provider).toBe("ollama");
      expect(model.modelId).toBe("glm-5.1:cloud");
    }
  });

  it("routes through ollama.com/v1 by default", async () => {
    const captured = mockAi((args) => [
      {
        toolName: (args["toolChoice"] as { toolName: string }).toolName,
        input: { score: 5, summary: "ok" },
      },
    ]);
    const { runToolCall } = await import("../src/lib/llm.ts");
    const schema = z.object({ score: z.number(), summary: z.string() });
    await runToolCall({
      tier: "balanced",
      maxTokens: 64,
      systemPrompt: "sys",
      userPrompt: "usr",
      tool: { name: "t", description: "d", schema },
    });
    const model = captured.args["model"] as { baseURL: string };
    expect(model.baseURL).toBe("https://ollama.com/v1");
  });

  it("honors OLLAMA_BASE_URL for local daemon routing", async () => {
    process.env["OLLAMA_BASE_URL"] = "http://localhost:11434/v1";
    vi.resetModules();
    const captured = mockAi((args) => [
      {
        toolName: (args["toolChoice"] as { toolName: string }).toolName,
        input: { score: 5, summary: "ok" },
      },
    ]);
    const { runToolCall } = await import("../src/lib/llm.ts");
    const schema = z.object({ score: z.number(), summary: z.string() });
    await runToolCall({
      tier: "balanced",
      maxTokens: 64,
      systemPrompt: "sys",
      userPrompt: "usr",
      tool: { name: "t", description: "d", schema },
    });
    expect((captured.args["model"] as { baseURL: string }).baseURL).toBe(
      "http://localhost:11434/v1",
    );
    delete process.env["OLLAMA_BASE_URL"];
  });

  it("honors LLM_MODEL_FAST override", async () => {
    process.env["LLM_MODEL_FAST"] = "glm-4.7:cloud";
    vi.resetModules();
    const captured = mockAi((args) => [
      {
        toolName: (args["toolChoice"] as { toolName: string }).toolName,
        input: { score: 5, summary: "ok" },
      },
    ]);
    const { runToolCall } = await import("../src/lib/llm.ts");
    const schema = z.object({ score: z.number(), summary: z.string() });
    await runToolCall({
      tier: "fast",
      maxTokens: 64,
      systemPrompt: "sys",
      userPrompt: "usr",
      tool: { name: "t", description: "d", schema },
    });
    expect((captured.args["model"] as { modelId: string }).modelId).toBe("glm-4.7:cloud");
  });

  it("throws OLLAMA_API_KEY is not set when key absent", async () => {
    delete process.env["OLLAMA_API_KEY"];
    vi.resetModules();
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
    ).rejects.toThrow("OLLAMA_API_KEY is not set");
  });

  it("apiKeyName() returns OLLAMA_API_KEY; isLLMAvailable() reflects key presence", async () => {
    const { apiKeyName, isLLMAvailable } = await import("../src/lib/llm.ts");
    expect(apiKeyName()).toBe("OLLAMA_API_KEY");
    expect(isLLMAvailable()).toBe(true);
  });
});

describe("runToolCall — timeout handling", () => {
  it("rejects with a timeout error when generateText hangs past timeoutMs", async () => {
    vi.doMock("ai", () => ({
      generateText: vi.fn(
        () =>
          new Promise(() => {
            /* never resolves */
          }),
      ),
      tool: (def: unknown) => def,
    }));
    vi.doMock("@ai-sdk/openai", () => ({
      openai: (id: string) => ({ __provider: "openai", modelId: id }),
      createOpenAI: () => (id: string) => ({ __provider: "ollama", modelId: id }),
    }));
    const { runToolCall } = await import("../src/lib/llm.ts");
    const schema = z.object({ score: z.number() });
    await expect(
      runToolCall({
        tier: "balanced",
        maxTokens: 64,
        systemPrompt: "sys",
        userPrompt: "usr",
        timeoutMs: 25,
        tool: { name: "t", description: "d", schema },
      }),
    ).rejects.toThrow(/timed out after 25ms/);
  });

  it("respects LLM_TIMEOUT_MS as the per-call default", async () => {
    process.env["LLM_TIMEOUT_MS"] = "30";
    vi.resetModules();
    vi.doMock("ai", () => ({
      generateText: vi.fn(
        () =>
          new Promise(() => {
            /* never resolves */
          }),
      ),
      tool: (def: unknown) => def,
    }));
    vi.doMock("@ai-sdk/openai", () => ({
      openai: (id: string) => ({ __provider: "openai", modelId: id }),
      createOpenAI: () => (id: string) => ({ __provider: "ollama", modelId: id }),
    }));
    const { runToolCall } = await import("../src/lib/llm.ts");
    const schema = z.object({ score: z.number() });
    await expect(
      runToolCall({
        tier: "balanced",
        maxTokens: 64,
        systemPrompt: "sys",
        userPrompt: "usr",
        tool: { name: "t", description: "d", schema },
      }),
    ).rejects.toThrow(/timed out after 30ms/);
    delete process.env["LLM_TIMEOUT_MS"];
  });
});
