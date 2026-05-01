import { z } from "zod";

/** Anthropic Messages model id; literal-union ensures callers can't pass an unknown model. */
export type AnthropicModel =
  | "claude-haiku-4-5-20251001"
  | "claude-sonnet-4-6"
  | "claude-opus-4-7";

/** One tool-use call shape; system prompt is cached, output is tool-use validated by Zod at the system edge. */
export interface ToolCallArgs<T> {
  readonly model: AnthropicModel;
  readonly maxTokens: number;
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly tool: {
    readonly name: string;
    readonly description: string;
    readonly input_schema: object;
  };
  readonly schema: z.ZodType<T>;
}

/** Lazy singleton; populated on first runToolCall invocation. */
let _client: { messages: { create: (args: unknown) => Promise<unknown> } } | null = null;

/** Returns or initialises the singleton client; throws if ANTHROPIC_API_KEY is absent. */
async function getClient(): Promise<{ messages: { create: (args: unknown) => Promise<unknown> } }> {
  if (_client) return _client;
  if (!process.env["ANTHROPIC_API_KEY"]) throw new Error("ANTHROPIC_API_KEY is not set");
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  _client = new Anthropic() as unknown as { messages: { create: (args: unknown) => Promise<unknown> } };
  return _client;
}

/** Runs one tool-use call; returns the typed parsed result, or null on empty / non-tool-use response. */
export async function runToolCall<T>(args: ToolCallArgs<T>): Promise<T | null> {
  const client = await getClient();
  const res = await client.messages.create({
    model: args.model,
    max_tokens: args.maxTokens,
    system: [{ type: "text", text: args.systemPrompt, cache_control: { type: "ephemeral" } }],
    tools: [args.tool],
    tool_choice: { type: "tool", name: args.tool.name },
    messages: [{ role: "user", content: args.userPrompt }],
  }) as { content: Array<{ type: string; input?: unknown }> };
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return null;
  const parsed = args.schema.safeParse((block as { input?: unknown }).input);
  if (!parsed.success) {
    process.stderr.write(`runToolCall: Zod validation failed — ${parsed.error.message}\n`);
    return null;
  }
  return parsed.data;
}
