import { generateText, tool, type LanguageModel } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { z } from "zod";

/** Provider-agnostic capability tier; mapped to a concrete model id at call time. */
export type ModelTier = "fast" | "balanced" | "deep";

/** Active provider. Set LLM_PROVIDER=ollama to route through Ollama's cloud endpoint. */
const PROVIDER = process.env["LLM_PROVIDER"] ?? "openai";

/** OpenAI model ids per tier. */
const OPENAI_IDS: Record<ModelTier, string> = {
  fast:     process.env["LLM_MODEL_FAST"]     ?? "gpt-4.1-mini",
  balanced: process.env["LLM_MODEL_BALANCED"] ?? "gpt-4.1",
  deep:     process.env["LLM_MODEL_DEEP"]     ?? "gpt-4.1",
};

/** Ollama model ids per tier — all default to glm-5.1:cloud (OpenAI-compat cloud endpoint). */
const OLLAMA_IDS: Record<ModelTier, string> = {
  fast:     process.env["LLM_OLLAMA_MODEL_FAST"]     ?? "glm-5.1:cloud",
  balanced: process.env["LLM_OLLAMA_MODEL_BALANCED"] ?? "glm-5.1:cloud",
  deep:     process.env["LLM_OLLAMA_MODEL_DEEP"]     ?? "glm-5.1:cloud",
};

const ollamaProvider = createOpenAI({
  baseURL: process.env["OLLAMA_BASE_URL"] ?? "https://ollama.com/v1",
  apiKey:  process.env["OLLAMA_API_KEY"]  ?? "",
});

function modelFor(tier: ModelTier): LanguageModel {
  return PROVIDER === "ollama"
    ? ollamaProvider(OLLAMA_IDS[tier])
    : openai(OPENAI_IDS[tier]);
}

/** The env-var name that must be set for the active provider. */
export function apiKeyName(): string {
  return PROVIDER === "ollama" ? "OLLAMA_API_KEY" : "OPENAI_API_KEY";
}

/** Returns true when the required API key for the active provider is present. */
export function isLLMAvailable(): boolean {
  return Boolean(process.env[apiKeyName()]);
}

/** One forced tool-use call; AI SDK validates output against the Zod schema, we re-narrow to T. */
export interface ToolCallArgs<T> {
  readonly tier: ModelTier;
  readonly maxTokens: number;
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly tool: {
    readonly name: string;
    readonly description: string;
    readonly schema: z.ZodType<T>;
  };
}

/** Runs one forced tool call; returns the typed parsed result, or null on empty / non-matching response. */
export async function runToolCall<T>(args: ToolCallArgs<T>): Promise<T | null> {
  if (!isLLMAvailable()) throw new Error(`${apiKeyName()} is not set`);
  const result = await generateText({
    model: modelFor(args.tier),
    maxOutputTokens: args.maxTokens,
    system: args.systemPrompt,
    prompt: args.userPrompt,
    tools: {
      [args.tool.name]: tool({
        description: args.tool.description,
        inputSchema: args.tool.schema,
      }),
    },
    toolChoice: { type: "tool", toolName: args.tool.name },
    maxRetries: 2,
  });
  const call = result.toolCalls.find((c) => c.toolName === args.tool.name);
  if (!call) return null;
  const parsed = args.tool.schema.safeParse(call.input);
  if (!parsed.success) {
    process.stderr.write(`runToolCall: Zod validation failed — ${parsed.error.message}\n`);
    return null;
  }
  return parsed.data;
}
