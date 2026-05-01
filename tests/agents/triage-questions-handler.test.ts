import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import matter from "gray-matter";

/** Minimal question file content. */
const QUESTION_MD = `---
question: "What is the right shape?"
asked: 2026-03-01
status: open
---

Question body here.
`;

/** Canonical payload for a question-answer-curate proposal. */
function makePayload(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    questionSlug: "foo",
    submissionPath: "submissions/questions/foo/bar.json",
    responder: { name: "Alice", credentials: "shipped auth" },
    submissionBody: "Here is my answer.",
    pointers: ["https://example.com"],
    relevanceScore: 0.8,
    dedupeOf: null,
    suggestedAnswer: "Alice argues mutual TLS is the right approach.",
    reasoning: "Direct domain experience.",
    receivedAt: "2026-04-30T10:00:00.000Z",
    ...overrides,
  };
}

/** Creates a temp dir and stubs process.cwd(); returns accessor. */
function useTmpDir(): { dir: () => string } {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "triage-h-"));
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    mkdirSync(join(dir, "content", "questions"), { recursive: true });
    mkdirSync(join(dir, "submissions", "questions", "foo"), { recursive: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    rmSync(dir, { recursive: true, force: true });
  });
  return { dir: () => dir };
}

describe("triage-questions handler — apply", () => {
  const { dir } = useTmpDir();

  it("appends the answer section to the question body and sets status to partial", async () => {
    vi.doMock("../../src/lib/llm.ts", () => ({ runToolCall: vi.fn() }));
    const { QuestionAnswerCuratePayload } =
      await import("../../src/lib/agents/triage-questions.ts");
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    const questionPath = join(dir(), "content", "questions", "foo.md");
    const submissionPath = join(dir(), "submissions", "questions", "foo", "bar.json");
    writeFileSync(questionPath, QUESTION_MD);
    writeFileSync(submissionPath, JSON.stringify({ questionSlug: "foo" }));
    const payload = makePayload();
    const handler = getHandler("question-answer-curate");
    const typed = {
      id: "test-id",
      source: "triage-questions" as const,
      type: "question-answer-curate" as const,
      createdAt: "2026-04-30T00:00:00.000Z",
      target: questionPath,
      title: "test",
      preview: "test",
      payload: QuestionAnswerCuratePayload.parse(payload),
    };
    const result = await handler.apply(typed);
    expect(result).toContain("foo.md");
    const updated = readFileSync(questionPath, "utf8");
    const parsed = matter(updated);
    expect(parsed.data["status"]).toBe("partial");
    expect(parsed.content).toContain("## Answer from Alice (2026-04-30)");
    expect(parsed.content).toContain("Alice argues mutual TLS is the right approach.");
  });

  it("moves the submission file to _accepted/ after apply", async () => {
    vi.doMock("../../src/lib/llm.ts", () => ({ runToolCall: vi.fn() }));
    const { QuestionAnswerCuratePayload } =
      await import("../../src/lib/agents/triage-questions.ts");
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    const questionPath = join(dir(), "content", "questions", "foo.md");
    const submissionPath = join(dir(), "submissions", "questions", "foo", "bar.json");
    writeFileSync(questionPath, QUESTION_MD);
    writeFileSync(submissionPath, JSON.stringify({ questionSlug: "foo" }));
    const handler = getHandler("question-answer-curate");
    const typed = {
      id: "test-id",
      source: "triage-questions" as const,
      type: "question-answer-curate" as const,
      createdAt: "2026-04-30T00:00:00.000Z",
      target: questionPath,
      title: "test",
      preview: "test",
      payload: QuestionAnswerCuratePayload.parse(makePayload()),
    };
    await handler.apply(typed);
    expect(existsSync(submissionPath)).toBe(false);
    expect(existsSync(join(dir(), "submissions", "_accepted", "foo", "bar.json"))).toBe(true);
  });
});

describe("triage-questions handler — edit", () => {
  const { dir } = useTmpDir();

  it("opens editor and on save validates the question file", async () => {
    vi.doMock("../../src/lib/llm.ts", () => ({ runToolCall: vi.fn() }));
    vi.stubEnv("EDITOR", "cat");
    const { QuestionAnswerCuratePayload } =
      await import("../../src/lib/agents/triage-questions.ts");
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    const questionPath = join(dir(), "content", "questions", "foo.md");
    const submissionPath = join(dir(), "submissions", "questions", "foo", "bar.json");
    writeFileSync(questionPath, QUESTION_MD);
    writeFileSync(submissionPath, JSON.stringify({ questionSlug: "foo" }));
    const handler = getHandler("question-answer-curate");
    const typed = {
      id: "test-id",
      source: "triage-questions" as const,
      type: "question-answer-curate" as const,
      createdAt: "2026-04-30T00:00:00.000Z",
      target: questionPath,
      title: "test",
      preview: "test",
      payload: QuestionAnswerCuratePayload.parse(makePayload()),
    };
    const result = await handler.edit(typed);
    expect(result).toContain("foo.md");
    vi.unstubAllEnvs();
  });
});

describe("triage-questions handler — reject", () => {
  const { dir } = useTmpDir();

  it("moves submission to _rejected/ and writes to the rejections JSON", async () => {
    vi.doMock("../../src/lib/llm.ts", () => ({ runToolCall: vi.fn() }));
    const { QuestionAnswerCuratePayload } =
      await import("../../src/lib/agents/triage-questions.ts");
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    const questionPath = join(dir(), "content", "questions", "foo.md");
    const submissionPath = join(dir(), "submissions", "questions", "foo", "bar.json");
    writeFileSync(questionPath, QUESTION_MD);
    writeFileSync(submissionPath, JSON.stringify({ questionSlug: "foo" }));
    const handler = getHandler("question-answer-curate");
    const typed = {
      id: "test-id",
      source: "triage-questions" as const,
      type: "question-answer-curate" as const,
      createdAt: "2026-04-30T00:00:00.000Z",
      target: questionPath,
      title: "test",
      preview: "test",
      payload: QuestionAnswerCuratePayload.parse(makePayload()),
    };
    await handler.reject!(typed);
    expect(existsSync(submissionPath)).toBe(false);
    expect(existsSync(join(dir(), "submissions", "_rejected", "foo", "bar.json"))).toBe(true);
    const rejections = JSON.parse(
      readFileSync(join(dir(), ".triage-questions-rejections.json"), "utf8"),
    ) as string[];
    expect(rejections).toContain("bar");
  });
});
