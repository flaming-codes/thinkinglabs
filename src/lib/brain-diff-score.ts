import { z } from "zod";
import { classify, type CommitDiff, type FileDiff } from "./brain-diff.ts";
import { runToolCall } from "./llm.ts";

/** Body diffs are truncated to keep per-call tokens bounded; substantiveness rarely needs more than the first ~1.5KB. */
const BODY_LIMIT = 1500;

/** Tool I/O contract; validated at the system edge so a malformed model response fails fast with a clear error. */
const SCORE_SCHEMA = z.object({ score: z.number().min(0).max(10), summary: z.string().min(1) });

/** System prompt is reused across calls; provider auto-caches above ~1k tokens so repeated invocations collapse in cost. */
const SYSTEM_PROMPT = `You score per-file changes in a personal-knowledge git repo for substantiveness.

Score 0–10:
- 0: pure formatting, typo fix, whitespace, link-only changes.
- 1–3: minor copyedits, small additions that do not change meaning.
- 4–6: meaningful edits, clarifications, evidence added.
- 7–10: new claim, claim deprecation, prediction resolution, decision reversal, status change, substantively rewritten thought.

Write a single-sentence summary in present tense (e.g., "Confidence on commodity-collapse claim raised from 0.6 to 0.7").
Call the extract_substantiveness tool exactly once.`;

/** Tool definition; forced tool-use guarantees the response shape so we don't parse free-text. */
const TOOL = {
  name: "extract_substantiveness",
  description: "Return the substantiveness score and a one-sentence summary for a file diff.",
  schema: SCORE_SCHEMA,
};

/** Render a compact context string for the LLM; classify() label is included so the model can rely on the typed dispatch. */
function fileContext(file: FileDiff): string {
  const fmDelta = `OLD frontmatter: ${JSON.stringify(file.oldFrontmatter ?? null)}\nNEW frontmatter: ${JSON.stringify(file.newFrontmatter ?? null)}`;
  const oldBody = (file.oldBody ?? "").slice(0, BODY_LIMIT);
  const newBody = (file.newBody ?? "").slice(0, BODY_LIMIT);
  return `path: ${file.path}\nstatus: ${file.status}\nclassified: ${classify(file)}\n\n${fmDelta}\n\nOLD body (truncated):\n${oldBody}\n\nNEW body (truncated):\n${newBody}`;
}

/** Score every file in every commit, keyed by `<sha>:<path>` so the formatter can look the score up. */
export async function scoreCommitFiles(
  commits: ReadonlyArray<CommitDiff>,
): Promise<Map<string, { score: number; summary: string }>> {
  const out = new Map<string, { score: number; summary: string }>();
  for (const c of commits) {
    for (const f of c.files) {
      const s = await runToolCall({
        tier: "fast",
        maxTokens: 256,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: fileContext(f),
        tool: TOOL,
      });
      if (s) out.set(`${c.sha}:${f.path}`, s.data);
    }
  }
  return out;
}
