import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Canonical valid submission JSON. */
const VALID_SUBMISSION = {
  questionSlug: "foo",
  receivedAt: "2026-04-30T10:00:00.000Z",
  responder: { name: "Alice", credentials: "shipped agent-to-agent auth at X" },
  body: "Here is my detailed answer to your question.",
  pointers: ["https://example.com/paper"],
};

/** Minimal question markdown file. */
const QUESTION_MD = `---
question: "What is the right shape?"
asked: 2026-03-01
status: open
ideal_responder: "Someone who shipped agent-to-agent auth in production."
---

Context goes here.
`;

/** Creates a temp dir and stubs process.cwd() to it; returns accessor. */
function useTmpDir(): { dir: () => string } {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "triage-q-"));
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    mkdirSync(join(dir, "submissions", "questions", "foo"), { recursive: true });
    mkdirSync(join(dir, "content", "questions"), { recursive: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    rmSync(dir, { recursive: true, force: true });
  });
  return { dir: () => dir };
}

describe("runTriageQuestions — main flows", () => {
  const { dir } = useTmpDir();

  it("emits 1 proposal when LLM returns relevance 0.8", async () => {
    vi.doMock("../../src/lib/anthropic.ts", () => ({
      runToolCall: vi.fn().mockResolvedValue({
        relevanceScore: 0.8,
        dedupeOf: null,
        suggestedAnswer: "Alice argues the system should use mutual TLS.",
        reasoning: "Direct experience with the domain.",
      }),
    }));
    const { runTriageQuestions } = await import("../../src/lib/agents/triage-questions.ts");
    writeFileSync(join(dir(), "submissions", "questions", "foo", "bar.json"), JSON.stringify(VALID_SUBMISSION));
    writeFileSync(join(dir(), "content", "questions", "foo.md"), QUESTION_MD);
    const summary = await runTriageQuestions({ cwd: dir(), nowISO: "2026-04-30T00:00:00.000Z", skipLLM: false });
    expect(summary.proposed).toBe(1);
    expect(summary.valid).toBe(1);
    expect(summary.scoredBelow).toBe(0);
  });

  it("moves submission to _skipped and emits 0 proposals when relevance 0.2", async () => {
    vi.doMock("../../src/lib/anthropic.ts", () => ({
      runToolCall: vi.fn().mockResolvedValue({
        relevanceScore: 0.2,
        dedupeOf: null,
        suggestedAnswer: "Off-topic answer.",
        reasoning: "Unrelated to the question.",
      }),
    }));
    const { runTriageQuestions } = await import("../../src/lib/agents/triage-questions.ts");
    writeFileSync(join(dir(), "submissions", "questions", "foo", "bar.json"), JSON.stringify(VALID_SUBMISSION));
    writeFileSync(join(dir(), "content", "questions", "foo.md"), QUESTION_MD);
    const summary = await runTriageQuestions({ cwd: dir(), nowISO: "2026-04-30T00:00:00.000Z", skipLLM: false });
    expect(summary.proposed).toBe(0);
    expect(summary.scoredBelow).toBe(1);
    expect(existsSync(join(dir(), "submissions", "_skipped", "bar.json"))).toBe(true);
  });

  it("moves submission to _orphaned when question file is missing", async () => {
    vi.doMock("../../src/lib/anthropic.ts", () => ({ runToolCall: vi.fn() }));
    const { runTriageQuestions } = await import("../../src/lib/agents/triage-questions.ts");
    writeFileSync(join(dir(), "submissions", "questions", "foo", "bar.json"), JSON.stringify(VALID_SUBMISSION));
    const summary = await runTriageQuestions({ cwd: dir(), nowISO: "2026-04-30T00:00:00.000Z", skipLLM: false });
    expect(summary.proposed).toBe(0);
    expect(summary.orphanedMoved).toBe(1);
    expect(existsSync(join(dir(), "submissions", "_orphaned", "bar.json"))).toBe(true);
  });

  it("moves malformed submission to _invalid with .error.txt and emits 0 proposals", async () => {
    vi.doMock("../../src/lib/anthropic.ts", () => ({ runToolCall: vi.fn() }));
    const { runTriageQuestions } = await import("../../src/lib/agents/triage-questions.ts");
    writeFileSync(join(dir(), "submissions", "questions", "foo", "bad.json"), "{ not valid json ]]]");
    const summary = await runTriageQuestions({ cwd: dir(), nowISO: "2026-04-30T00:00:00.000Z", skipLLM: false });
    expect(summary.proposed).toBe(0);
    expect(summary.invalidMoved).toBe(1);
    expect(existsSync(join(dir(), "submissions", "_invalid", "bad.json"))).toBe(true);
    expect(existsSync(join(dir(), "submissions", "_invalid", "bad.error.txt"))).toBe(true);
  });

  it("moves submission with missing required fields to _invalid", async () => {
    vi.doMock("../../src/lib/anthropic.ts", () => ({ runToolCall: vi.fn() }));
    const { runTriageQuestions } = await import("../../src/lib/agents/triage-questions.ts");
    writeFileSync(join(dir(), "submissions", "questions", "foo", "bad2.json"), JSON.stringify({ questionSlug: "foo" }));
    const summary = await runTriageQuestions({ cwd: dir(), nowISO: "2026-04-30T00:00:00.000Z", skipLLM: false });
    expect(summary.invalidMoved).toBe(1);
    expect(existsSync(join(dir(), "submissions", "_invalid", "bad2.error.txt"))).toBe(true);
  });

  it("--no-llm emits a proposal with relevanceScore null and suggestedAnswer empty", async () => {
    vi.doMock("../../src/lib/anthropic.ts", () => ({ runToolCall: vi.fn() }));
    const { runTriageQuestions } = await import("../../src/lib/agents/triage-questions.ts");
    writeFileSync(join(dir(), "submissions", "questions", "foo", "bar.json"), JSON.stringify(VALID_SUBMISSION));
    writeFileSync(join(dir(), "content", "questions", "foo.md"), QUESTION_MD);
    const summary = await runTriageQuestions({ cwd: dir(), nowISO: "2026-04-30T00:00:00.000Z", skipLLM: true });
    expect(summary.proposed).toBe(1);
    const { readQueue } = await import("../../src/lib/proposal-queue.ts");
    const proposals = readQueue();
    expect(proposals).toHaveLength(1);
    const payload = proposals[0]?.payload as { relevanceScore: unknown; suggestedAnswer: unknown };
    expect(payload.relevanceScore).toBeNull();
    expect(payload.suggestedAnswer).toBe("");
  });

  it("does not rescan files already in _accepted/", async () => {
    vi.doMock("../../src/lib/anthropic.ts", () => ({ runToolCall: vi.fn() }));
    const { runTriageQuestions } = await import("../../src/lib/agents/triage-questions.ts");
    mkdirSync(join(dir(), "submissions", "_accepted", "foo"), { recursive: true });
    writeFileSync(join(dir(), "submissions", "_accepted", "foo", "bar.json"), JSON.stringify(VALID_SUBMISSION));
    const summary = await runTriageQuestions({ cwd: dir(), nowISO: "2026-04-30T00:00:00.000Z", skipLLM: true });
    expect(summary.scanned).toBe(0);
  });
});
