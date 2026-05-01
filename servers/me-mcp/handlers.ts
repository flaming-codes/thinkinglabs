import { z } from "zod";
import { buildEntries, applyGenericGate, walkCommits } from "../../src/lib/brain-diff.ts";
import type { Contact } from "../../src/schemas/contact.ts";
import { existsSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { loadContact, queryView } from "./store.ts";
import { writeJsonState } from "../../src/lib/json-state.ts";
import { submissionSchema } from "../../src/schemas/submission.ts";
import { publicViewSchema } from "./types.ts";
import type { QueryViewArgs, ToolTextResult } from "./types.ts";

/** Zod raw-shape for the public query_view tool input. */
export const queryViewInputSchema = {
  view: publicViewSchema,
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(50).optional(),
};

/** Zod raw-shape for open-question answer submission. */
export const questionSubmitInputSchema = {
  questionSlug: z.string().min(1),
  responder: submissionSchema.shape.responder,
  body: z.string().min(1),
  pointers: z.array(z.string()).default([]),
};

/** Zod raw-shape for contact precheck input. */
export const contactPrecheckInputSchema = {
  intent: z.string().min(1),
  message: z.string().optional(),
  language: z.string().optional(),
  budget_eur: z.number().nonnegative().optional(),
};

/** Zod raw-shape for contact send input. */
export const contactSendInputSchema = {
  from: z.string().min(3),
  subject: z.string().min(1),
  message: z.string().min(1),
  intent: z.string().min(1),
  language: z.string().optional(),
};

/** Zod raw-shape for brain-diff subscription input. */
export const subscribeBrainDiffInputSchema = {
  since: z.string().default("HEAD~20"),
  include_recent: z.boolean().default(false),
  site_url: z.url().default("https://tom.wild.as"),
};

/** Inferred input accepted by contact.precheck. */
export type ContactPrecheckInput = z.infer<z.ZodObject<typeof contactPrecheckInputSchema>>;

/** Inferred input accepted by contact.send. */
export type ContactSendInput = z.infer<z.ZodObject<typeof contactSendInputSchema>>;

/** Inferred input accepted by subscribe_brain_diff. */
export type SubscribeBrainDiffInput = z.infer<z.ZodObject<typeof subscribeBrainDiffInputSchema>>;

/** Inferred input accepted by question.submit. */
export type QuestionSubmitInput = z.infer<z.ZodObject<typeof questionSubmitInputSchema>>;

/** Per-request context shared by MCP tool handlers. */
export interface HandlerContext {
  readonly repoRoot: string;
}

/** Handler for the `query_view` MCP tool. */
export function handleQueryView(ctx: HandlerContext, args: QueryViewArgs): ToolTextResult {
  try {
    return jsonToolResult(queryView(ctx.repoRoot, args));
  } catch (error) {
    return jsonToolResult({ view: args.view, source: "error", count: 0, items: [], reason: errorMessage(error) }, true);
  }
}

/** Handler for the `contact.precheck` MCP tool. */
export function handleContactPrecheck(ctx: HandlerContext, args: ContactPrecheckInput): ToolTextResult {
  try {
    const contact = loadContact(ctx.repoRoot);
    return jsonToolResult(precheckContact(contact, args));
  } catch (error) {
    return jsonToolResult({ verdict: "decline", reason: `precheck failed: ${errorMessage(error)}`, matched: null }, true);
  }
}

/** Handler for the `contact.send` MCP tool. */
export function handleContactSend(ctx: HandlerContext, args: ContactSendInput): ToolTextResult {
  try {
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
  } catch (error) {
    return jsonToolResult({ accepted: false, sent: false, reason: `send failed: ${errorMessage(error)}` }, true);
  }
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
    return jsonToolResult({ subscribed: false, feeds, since: args.since, reason: errorMessage(error) }, true);
  }
}

/** Slug pattern accepted by submission writers; mirrors the content-collection naming convention. */
const SAFE_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/;

/** Handler for the `question.submit` MCP intake tool. */
export function handleQuestionSubmit(ctx: HandlerContext, args: QuestionSubmitInput): ToolTextResult {
  if (!SAFE_SLUG.test(args.questionSlug)) {
    return jsonToolResult({ accepted: false, reason: "questionSlug must match [a-z0-9-] (1-100 chars, no leading/trailing dash)", questionSlug: args.questionSlug }, true);
  }
  const questionPath = join(ctx.repoRoot, "content", "questions", `${args.questionSlug}.md`);
  if (!existsSync(questionPath)) return jsonToolResult({ accepted: false, reason: "unknown questionSlug", questionSlug: args.questionSlug }, true);
  try {
    const receivedAt = new Date().toISOString();
    const submission = submissionSchema.parse({ ...args, receivedAt });
    const dir = join(ctx.repoRoot, "submissions", "questions", args.questionSlug);
    mkdirSync(dir, { recursive: true });
    const safeName = `${receivedAt.replace(/[:.]/g, "-")}-${slugPart(args.responder.name)}.json`;
    const file = join(dir, safeName);
    writeJsonState(file, submission);
    return jsonToolResult({ accepted: true, file, triage: "queued", submission });
  } catch (error) {
    return jsonToolResult({ accepted: false, reason: errorMessage(error), questionSlug: args.questionSlug }, true);
  }
}

/** Contact policy classifier shared by precheck and send handlers. */
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

/** Caps the haystack the matcher inspects so a hostile message cannot force quadratic scans. */
const MATCH_TEXT_CAP = 8_000;

function matchPolicy(text: string, entries: ReadonlyArray<string>): string | null {
  const haystack = text.length > MATCH_TEXT_CAP ? text.slice(0, MATCH_TEXT_CAP) : text;
  return entries.find((entry) => {
    const terms = entry.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length >= 4);
    return terms.length > 0 && terms.some((term) => haystack.includes(term));
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

function slugPart(value: string): string {
  return basename(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "anonymous");
}
