import { generateText, tool, type LanguageModel } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { ModelRef } from "../schemas/provenance.ts";

/** Provider-agnostic capability tier; mapped to a concrete model id at call time. */
export type ModelTier = "fast" | "balanced" | "deep";

/** Active provider. Set LLM_PROVIDER=ollama to route through Ollama's cloud endpoint. */
const PROVIDER = process.env["LLM_PROVIDER"] ?? "openai";

/** Default model ids per tier for the active provider. */
function defaultModelIds(): Record<ModelTier, string> {
  if (PROVIDER === "ollama") {
    return { fast: "glm-5.1:cloud", balanced: "glm-5.1:cloud", deep: "glm-5.1:cloud" };
  }
  return { fast: "gpt-4.1-mini", balanced: "gpt-4.1", deep: "gpt-4.1" };
}
const DEFAULT_IDS = defaultModelIds();

/** Model ids per tier — env-var overrides take precedence over the provider default. */
const MODEL_IDS: Record<ModelTier, string> = {
  fast: process.env["LLM_MODEL_FAST"] ?? DEFAULT_IDS.fast,
  balanced: process.env["LLM_MODEL_BALANCED"] ?? DEFAULT_IDS.balanced,
  deep: process.env["LLM_MODEL_DEEP"] ?? DEFAULT_IDS.deep,
};

const ollamaProvider = createOpenAI({
  baseURL: process.env["OLLAMA_BASE_URL"] ?? "https://ollama.com/v1",
  apiKey: process.env["OLLAMA_API_KEY"] ?? "",
});

function modelFor(tier: ModelTier): LanguageModel {
  return PROVIDER === "ollama" ? ollamaProvider(MODEL_IDS[tier]) : openai(MODEL_IDS[tier]);
}

/** Concrete model identity for one capability tier under the current env configuration. */
export function currentModelRef(tier: ModelTier): ModelRef {
  return {
    provider: PROVIDER === "ollama" ? "ollama" : "openai",
    model: MODEL_IDS[tier],
    tier,
  };
}

/** Concrete model identities for every capability tier under the current env configuration. */
export function currentModelRefs(): Record<ModelTier, ModelRef> {
  return {
    fast: currentModelRef("fast"),
    balanced: currentModelRef("balanced"),
    deep: currentModelRef("deep"),
  };
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
  /** Per-call timeout in milliseconds; defaults to LLM_TIMEOUT_MS or 60s. */
  readonly timeoutMs?: number;
  readonly tool: {
    readonly name: string;
    readonly description: string;
    readonly schema: z.ZodType<T>;
  };
}

/** Default timeout (ms) for one LLM call; overridable per-call or via LLM_TIMEOUT_MS. */
const DEFAULT_TIMEOUT_MS = (() => {
  const raw = Number.parseInt(process.env["LLM_TIMEOUT_MS"] ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
})();

/** Wraps a promise with a hard timeout that surfaces a typed error. */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label}: timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Runs one forced tool call; returns parsed data plus the model identity used for the call. */
export async function runToolCall<T>(
  args: ToolCallArgs<T>,
): Promise<{ data: T; model: ModelRef } | null> {
  if (!isLLMAvailable()) throw new Error(`${apiKeyName()} is not set`);
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const model = currentModelRef(args.tier);
  const result = await withTimeout(
    generateText({
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
    }),
    timeoutMs,
    `runToolCall(${args.tool.name})`,
  );
  const call = result.toolCalls.find((c) => c.toolName === args.tool.name);
  if (!call) {
    process.stderr.write(`runToolCall(${args.tool.name}): no matching tool call in response\n`);
    return null;
  }
  const parsed = args.tool.schema.safeParse(call.input);
  if (!parsed.success) {
    process.stderr.write(
      `runToolCall(${args.tool.name}): Zod validation failed — ${parsed.error.message}\n`,
    );
    return null;
  }
  return { data: parsed.data, model };
}
