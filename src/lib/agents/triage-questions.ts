import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { runToolCall } from "../llm.ts";
import { appendSection } from "../body-append.ts";
import { editInEditor } from "../editor.ts";
import { patchFrontmatter } from "../frontmatter.ts";
import { readJsonState, writeJsonState } from "../json-state.ts";
import { enqueue, proposalId, readQueue } from "../proposal-queue.ts";
import { registerHandler } from "../proposal-dispatch.ts";
import { questionSchema } from "../../schemas/question.ts";
import { submissionSchema } from "../../schemas/submission.ts";
import type { QueuedProposal } from "../proposal-queue.ts";

/** LLM-scored triage output for one submission; validated via Zod at the system edge. */
export const TriageDraft = z.object({
  relevanceScore: z.number().min(0).max(1),
  dedupeOf: z.string().nullable(),
  suggestedAnswer: z.string().min(1),
  reasoning: z.string().min(1),
});

/** Inferred type for TriageDraft. */
export type TriageDraft = z.infer<typeof TriageDraft>;

/** Payload carried by a question-answer-curate proposal. */
export const QuestionAnswerCuratePayload = z.object({
  questionSlug: z.string(),
  submissionPath: z.string(),
  responder: submissionSchema.shape.responder,
  submissionBody: z.string(),
  pointers: z.array(z.string()),
  relevanceScore: z.number().nullable(),
  dedupeOf: z.string().nullable(),
  suggestedAnswer: z.string(),
  reasoning: z.string(),
  receivedAt: z.string(),
});

/** Inferred type for QuestionAnswerCuratePayload. */
export type QuestionAnswerCuratePayload = z.infer<typeof QuestionAnswerCuratePayload>;

/** Summary returned by runTriageQuestions. */
export interface TriageQuestionsSummary {
  readonly scanned: number;
  readonly valid: number;
  readonly invalidMoved: number;
  readonly orphanedMoved: number;
  readonly scoredBelow: number;
  readonly proposed: number;
  readonly deduped: number;
}

/** Absolute path to the rejections log; anchored to cwd so tests can supply a temp dir. */
function rejectionsPath(cwd: string): string {
  return join(resolve(cwd), ".triage-questions-rejections.json");
}

/** Ensures the directory exists, creating it (and parents) if absent. */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Moves a file to destDir, creating the directory if needed; returns the new path. */
function moveTo(src: string, destDir: string): string {
  ensureDir(destDir);
  const dest = join(destDir, basename(src));
  renameSync(src, dest);
  return dest;
}

/** Walks submissions/questions/*\/*.json and returns all found paths. */
function findSubmissionFiles(cwd: string): string[] {
  const submissionsDir = join(resolve(cwd), "submissions", "questions");
  if (!existsSync(submissionsDir)) return [];
  const files: string[] = [];
  for (const slug of readdirSync(submissionsDir)) {
    const slugDir = join(submissionsDir, slug);
    try {
      for (const file of readdirSync(slugDir)) {
        if (file.endsWith(".json")) files.push(join(slugDir, file));
      }
    } catch {
      /* skip non-directory entries */
    }
  }
  return files;
}

/** System prompt for the triage_submission tool; cached via prompt-caching. */
const SYSTEM_PROMPT = `You are a submission triage assistant for a personal knowledge site.

Given an open question and a reader's submitted answer, evaluate the submission against the question's ideal_responder profile, the question context, and any existing accepted answers.

Return a triage_submission tool call with:
- relevanceScore: float [0,1]. 0 = completely off-topic or spam, 1 = perfect fit from ideal responder with novel insight. Score against the ideal_responder field if present; otherwise score against question context.
- dedupeOf: if this submission substantially duplicates an existing accepted answer (same insight, same conclusion), provide the heading id of that existing answer (e.g. "answer-from-alice-2026-01-01"). Otherwise null.
- suggestedAnswer: a concise, well-formed markdown paragraph curating the key insight from the submission body. Write it in third person or as a paraphrase, attributed to the responder. This is a draft the human can accept or refine.
- reasoning: one sentence explaining the relevance score and any deduplication decision.

Call triage_submission exactly once.`;

/** Tool definition for the triage_submission tool. */
const TRIAGE_TOOL = {
  name: "triage_submission",
  description: "Score and summarize a reader submission for an open question.",
  schema: TriageDraft,
};

/** Builds the user prompt for the LLM triage call. */
function buildUserPrompt(args: {
  questionSlug: string;
  questionFrontmatter: Record<string, unknown>;
  questionBody: string;
  submissionBody: string;
  responderCredentials: string | undefined;
  responderName: string;
}): string {
  const fm = JSON.stringify(args.questionFrontmatter, null, 2);
  const creds = args.responderCredentials
    ? `\nResponder credentials: ${args.responderCredentials}`
    : "";
  return `Question slug: ${args.questionSlug}
Question frontmatter:
${fm}

Question body (including any existing accepted answers):
${args.questionBody}

Responder: ${args.responderName}${creds}

Submission body:
${args.submissionBody}`;
}

/** Formats the section heading for an accepted answer. */
function answerHeading(responderName: string, receivedAt: string): string {
  const date = receivedAt.slice(0, 10);
  return `Answer from ${responderName} (${date})`;
}

/** Formats the section body for an accepted answer. */
function answerSectionBody(suggestedAnswer: string, pointers: string[]): string {
  const pointersLine =
    pointers.length > 0
      ? `\n\n*Pointers:* ${pointers.map((p) => (p.startsWith("http") ? `[${p}](${p})` : p)).join(", ")}`
      : "";
  return `${suggestedAnswer}${pointersLine}`;
}

/** Moves a submission to the accepted directory and returns the new path. */
function moveToAccepted(cwd: string, submissionPath: string, questionSlug: string): string {
  const dest = join(resolve(cwd), "submissions", "_accepted", questionSlug);
  return moveTo(submissionPath, dest);
}

/** Walks submissions, triages each one, enqueues proposals; returns a summary tally. */
export async function runTriageQuestions(args: {
  cwd: string;
  nowISO: string;
  skipLLM: boolean;
}): Promise<TriageQuestionsSummary> {
  const { cwd, nowISO, skipLLM } = args;
  const cwdResolved = resolve(cwd);

  const rejections = readJsonState<string[]>(rejectionsPath(cwd), []);
  const rejectionSet = new Set(rejections);
  const existingIds = new Set(readQueue(cwd).map((p) => p.id));

  const files = findSubmissionFiles(cwd);
  let valid = 0;
  let invalidMoved = 0;
  let orphanedMoved = 0;
  let scoredBelow = 0;
  let proposed = 0;
  let deduped = 0;

  for (const filePath of files) {
    const submissionId = basename(filePath, ".json");

    if (rejectionSet.has(submissionId)) continue;

    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (e) {
      const invalidDir = join(cwdResolved, "submissions", "_invalid");
      moveTo(filePath, invalidDir);
      writeFileSync(
        join(invalidDir, `${submissionId}.error.txt`),
        `JSON parse error: ${String(e)}`,
        "utf8",
      );
      invalidMoved++;
      continue;
    }

    const parsed = submissionSchema.safeParse(raw);
    if (!parsed.success) {
      const invalidDir = join(cwdResolved, "submissions", "_invalid");
      moveTo(filePath, invalidDir);
      writeFileSync(
        join(invalidDir, `${submissionId}.error.txt`),
        `Validation error: ${parsed.error.message}`,
        "utf8",
      );
      invalidMoved++;
      continue;
    }

    const submission = parsed.data;
    valid++;

    const questionPath = join(cwdResolved, "content", "questions", `${submission.questionSlug}.md`);
    if (!existsSync(questionPath)) {
      moveTo(filePath, join(cwdResolved, "submissions", "_orphaned"));
      orphanedMoved++;
      continue;
    }

    const questionRaw = readFileSync(questionPath, "utf8");
    const { data: questionFm, content: questionBody } = matter(questionRaw);

    if (skipLLM) {
      continue;
    }

    let draft: TriageDraft | null = null;

    draft = await runToolCall({
      tier: "balanced",
      maxTokens: 1024,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt({
        questionSlug: submission.questionSlug,
        questionFrontmatter: questionFm as Record<string, unknown>,
        questionBody,
        submissionBody: submission.body,
        responderCredentials: submission.responder.credentials,
        responderName: submission.responder.name,
      }),
      tool: TRIAGE_TOOL,
    });

    if (!draft) {
      continue;
    }

    if (draft.relevanceScore < 0.4) {
      moveTo(filePath, join(cwdResolved, "submissions", "_skipped"));
      scoredBelow++;
      continue;
    }

    const relPath = relative(cwdResolved, filePath);
    const payload: QuestionAnswerCuratePayload = {
      questionSlug: submission.questionSlug,
      submissionPath: relPath,
      responder: submission.responder,
      submissionBody: submission.body,
      pointers: submission.pointers,
      relevanceScore: draft.relevanceScore,
      dedupeOf: draft.dedupeOf,
      suggestedAnswer: draft.suggestedAnswer,
      reasoning: draft.reasoning,
      receivedAt: submission.receivedAt,
    };

    const id = proposalId("triage-questions", "question-answer-curate", questionPath, {
      receivedAt: submission.receivedAt,
      submissionPath: relPath,
    });
    if (existingIds.has(id)) {
      deduped++;
      continue;
    }

    const responderLabel = submission.responder.affiliation
      ? `${submission.responder.name} (${submission.responder.affiliation})`
      : submission.responder.name;

    const scoreLabel = ` (relevance ${draft.relevanceScore.toFixed(2)})`;

    enqueue(
      {
        id,
        source: "triage-questions",
        type: "question-answer-curate",
        createdAt: nowISO,
        target: questionPath,
        title: `Answer to ${submission.questionSlug} from ${responderLabel}`,
        preview: `${submission.questionSlug}: answer from ${responderLabel}${scoreLabel}. ${draft.reasoning}`,
        payload,
      },
      cwd,
    );
    proposed++;
  }

  return {
    scanned: files.length,
    valid,
    invalidMoved,
    orphanedMoved,
    scoredBelow,
    proposed,
    deduped,
  };
}

/** Handler registered at module load for the review-proposals CLI. */
const handler = {
  type: "question-answer-curate" as const,
  payloadSchema: QuestionAnswerCuratePayload,
  parse(proposal: QueuedProposal): QuestionAnswerCuratePayload {
    return QuestionAnswerCuratePayload.parse(proposal.payload);
  },
  async apply(
    proposal: QueuedProposal & { payload: QuestionAnswerCuratePayload },
  ): Promise<string> {
    if (!proposal.target) throw new Error("triage-questions apply: missing target path");
    const { payload } = proposal;
    const cwd = resolve(process.cwd());
    const submissionAbs = resolve(cwd, payload.submissionPath);
    const heading = answerHeading(payload.responder.name, payload.receivedAt);
    const body = answerSectionBody(payload.suggestedAnswer, payload.pointers);
    appendSection(proposal.target, heading, body);
    await patchFrontmatter(proposal.target, (data) => {
      data["status"] = "partial";
    });
    if (existsSync(submissionAbs)) moveToAccepted(cwd, submissionAbs, payload.questionSlug);
    return `appended answer from ${payload.responder.name} to ${proposal.target}`;
  },
  async edit(proposal: QueuedProposal & { payload: QuestionAnswerCuratePayload }): Promise<string> {
    if (!proposal.target) throw new Error("triage-questions edit: missing target path");
    const { payload } = proposal;
    const cwd = resolve(process.cwd());
    const submissionAbs = resolve(cwd, payload.submissionPath);
    const raw = readFileSync(proposal.target, "utf8");
    const edited = await editInEditor(raw, ".md");
    const parsedMatter = matter(edited);
    questionSchema.parse(parsedMatter.data);
    writeFileSync(proposal.target, edited, "utf8");
    if (existsSync(submissionAbs)) moveToAccepted(cwd, submissionAbs, payload.questionSlug);
    return `edited ${proposal.target}`;
  },
  async reject(proposal: QueuedProposal & { payload: QuestionAnswerCuratePayload }): Promise<void> {
    const { payload } = proposal;
    const cwd = resolve(process.cwd());
    const submissionAbs = resolve(cwd, payload.submissionPath);
    const submissionId = basename(payload.submissionPath, ".json");
    if (existsSync(submissionAbs)) {
      moveTo(submissionAbs, join(cwd, "submissions", "_rejected", payload.questionSlug));
    }
    const rejections = readJsonState<string[]>(rejectionsPath(cwd), []);
    if (!rejections.includes(submissionId)) {
      writeJsonState(rejectionsPath(cwd), [...rejections, submissionId]);
    }
  },
};

registerHandler(handler);
