import { z } from "zod";
import { buildEntries, applyGenericGate, walkCommits } from "../../src/lib/brain-diff.ts";
import type { Contact } from "../../src/schemas/contact.ts";
import { loadContact, queryView } from "./store.ts";
import type { QueryViewArgs, ToolTextResult } from "./types.ts";

export const queryViewInputSchema = {
  view: z.enum(["thoughts", "claims", "projects", "decisions", "predictions", "inputs", "current_focus"]),
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(50).optional(),
};

export const contactPrecheckInputSchema = {
  intent: z.string().min(1),
  message: z.string().optional(),
  language: z.string().optional(),
  budget_eur: z.number().nonnegative().optional(),
};

export const contactSendInputSchema = {
  from: z.string().min(3),
  subject: z.string().min(1),
  message: z.string().min(1),
  intent: z.string().min(1),
  language: z.string().optional(),
};

export const subscribeBrainDiffInputSchema = {
  since: z.string().default("HEAD~20"),
  include_recent: z.boolean().default(false),
  site_url: z.url().default("https://tom.wild.as"),
};

export type ContactPrecheckInput = z.infer<z.ZodObject<typeof contactPrecheckInputSchema>>;
export type ContactSendInput = z.infer<z.ZodObject<typeof contactSendInputSchema>>;
export type SubscribeBrainDiffInput = z.infer<z.ZodObject<typeof subscribeBrainDiffInputSchema>>;

export interface HandlerContext {
  readonly repoRoot: string;
}

/** Handler for the `query_view` MCP tool. */
export function handleQueryView(ctx: HandlerContext, args: QueryViewArgs): ToolTextResult {
  const result = queryView(ctx.repoRoot, args);
  return jsonToolResult(result);
}

/** Handler for the `contact.precheck` MCP tool. */
export function handleContactPrecheck(ctx: HandlerContext, args: ContactPrecheckInput): ToolTextResult {
  const contact = loadContact(ctx.repoRoot);
  return jsonToolResult(precheckContact(contact, args));
}

/** Handler for the `contact.send` MCP tool. */
export function handleContactSend(ctx: HandlerContext, args: ContactSendInput): ToolTextResult {
  const contact = loadContact(ctx.repoRoot);
  const precheck = precheckContact(contact, { intent: args.intent, message: args.message, language: args.language });
  const email = contact.channels.find((channel) => channel.type === "email");
  const result = {
    accepted: precheck.verdict !== "decline",
    sent: false,
    delivery: "client_handoff",
    reason: precheck.reason,
    to: email?.type === "email" ? email.address : null,
    subject: args.subject,
    from: args.from,
    precheck,
  };
  return jsonToolResult(result, precheck.verdict === "decline");
}

/** Handler for the `subscribe_brain_diff` MCP tool. */
export function handleSubscribeBrainDiff(ctx: HandlerContext, args: SubscribeBrainDiffInput): ToolTextResult {
  const feeds = {
    atom: `${args.site_url}/feed/brain-diff.xml`,
    json: `${args.site_url}/feed/brain-diff.json`,
    claims_revised: `${args.site_url}/feed/claims-revised.json`,
    decisions_reversed: `${args.site_url}/feed/decisions-reversed.json`,
    predictions_resolved: `${args.site_url}/feed/predictions-resolved.json`,
  };
  if (!args.include_recent) return jsonToolResult({ subscribed: true, feeds });
  try {
    const recent = applyGenericGate(buildEntries(walkCommits({ since: args.since, cwd: ctx.repoRoot })));
    return jsonToolResult({ subscribed: true, feeds, since: args.since, recent });
  } catch (error) {
    return jsonToolResult({ subscribed: true, feeds, since: args.since, recent: [], warning: errorMessage(error) });
  }
}

export function precheckContact(contact: Contact, args: ContactPrecheckInput): { verdict: "same_day_reply" | "queued" | "decline"; reason: string; matched: string | null; advisory_rate: Contact["advisory_rate"]; channels: Contact["channels"] } {
  const text = `${args.intent} ${args.message ?? ""}`.toLowerCase();
  const decline = matchPolicy(text, contact.decline);
  if (decline) return verdict("decline", decline, contact);
  const sameDay = matchPolicy(text, contact.same_day_reply);
  if (sameDay) return verdict("same_day_reply", sameDay, contact);
  const queued = matchPolicy(text, contact.queued);
  if (queued) return verdict("queued", queued, contact);
  return { verdict: "queued", reason: "No explicit fast path matched; send only if the inquiry is concrete and artifact-tied.", matched: null, advisory_rate: contact.advisory_rate, channels: contact.channels };
}

function verdict(kind: "same_day_reply" | "queued" | "decline", matched: string, contact: Contact): ReturnType<typeof precheckContact> {
  return { verdict: kind, reason: `Matched contact policy: ${matched}`, matched, advisory_rate: contact.advisory_rate, channels: contact.channels };
}

function matchPolicy(text: string, entries: ReadonlyArray<string>): string | null {
  return entries.find((entry) => {
    const terms = entry.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length >= 4);
    return terms.length > 0 && terms.some((term) => text.includes(term));
  }) ?? null;
}

function jsonToolResult(value: unknown, isError = false): ToolTextResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value as { [key: string]: unknown },
    ...(isError ? { isError: true } : {}),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
