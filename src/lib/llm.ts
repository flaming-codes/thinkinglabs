import { generateText, tool, type LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

/** Provider-agnostic capability tier; mapped to a concrete model id at call time. */
export type ModelTier = "fast" | "balanced" | "deep";

/** Env-overridable tier → model-id map. To swap providers, change the factory in modelFor. */
const MODEL_IDS: Record<ModelTier, string> = {
  fast: process.env["LLM_MODEL_FAST"] ?? "gpt-4.1-mini",
  balanced: process.env["LLM_MODEL_BALANCED"] ?? "gpt-4.1",
  deep: process.env["LLM_MODEL_DEEP"] ?? "gpt-4.1",
};

function modelFor(tier: ModelTier): LanguageModel {
  return openai(MODEL_IDS[tier]);
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
  if (!process.env["OPENAI_API_KEY"]) throw new Error("OPENAI_API_KEY is not set");
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
