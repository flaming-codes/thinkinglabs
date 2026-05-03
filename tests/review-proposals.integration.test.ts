import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { writeJsonState } from "../src/lib/json-state.ts";
import type { QueuedProposal } from "../src/lib/proposal-queue.ts";

/** Asserts `git` is on PATH at module load; fail loudly rather than silently skipping coverage. */
function assertGitAvailable(): void {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error(
      "git is required for this integration test but was not found on PATH. " +
        "Install git or run in an environment that ships it.",
    );
  }
}
assertGitAvailable();

/** Absolute path to the CLI script. */
const SCRIPT = join(process.cwd(), "scripts", "review-proposals.ts");

describe("review-proposals CLI (integration)", () => {
  it("exits 0 with '0 proposals' when queue is empty", () => {
    const root = mkdtempSync(join(tmpdir(), "review-proposals-int-"));
    try {
      const result = spawnSync("tsx", [SCRIPT], { cwd: root, encoding: "utf8", timeout: 30_000 });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("0 proposals");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  it("exits 2 on unknown --filter value", () => {
    const root = mkdtempSync(join(tmpdir(), "review-proposals-int-"));
    try {
      const result = spawnSync("tsx", [SCRIPT, "--filter", "not-a-source"], {
        cwd: root,
        encoding: "utf8",
        timeout: 30_000,
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("unknown source");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  it("exits non-zero with an explicit error when queue state is malformed", () => {
    const root = mkdtempSync(join(tmpdir(), "review-proposals-int-"));
    try {
      writeJsonState(join(root, ".proposal-queue.json"), { proposals: "bad-shape" });
      const result = spawnSync("tsx", [SCRIPT], {
        cwd: root,
        encoding: "utf8",
        timeout: 30_000,
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("malformed queue file");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  it("accepting a queued LLM proposal writes provenance before removing it", () => {
    const root = mkdtempSync(join(tmpdir(), "review-proposals-prov-"));
    try {
      const predDir = join(root, "content", "predictions");
      mkdirSync(predDir, { recursive: true });
      const target = join(predDir, "prov-pred.md");
      writeFileSync(
        target,
        `---\nprediction: "A provenance test prediction resolves."\nmade: 2026-01-01\nresolves: 2026-02-01\nconfidence: 0.7\nresolution: pending\nresolved_on: null\nresolution_note: null\nevidence_at_time: []\ntags: []\n---\nBody.\n`,
        "utf8",
      );
      const proposal: QueuedProposal = {
        id: "provenance-proposal",
        source: "resolve-predictions",
        type: "prediction-resolve",
        createdAt: "2026-05-02T10:00:00.000Z",
        target,
        title: "Resolve provenance prediction",
        preview: "Resolve as true.",
        payload: {
          resolution: "true",
          resolution_note: "It resolved.",
          reasoning: "Evidence supports it.",
          resolvedOnISO: "2026-05-02T10:00:00.000Z",
        },
        provenance: {
          process_id: "resolve-predictions",
          event_type: "content_resolution",
          actor: {
            kind: "llm",
            model: { provider: "ollama", model: "glm-5.1:cloud", tier: "balanced" },
          },
          started_at: "2026-05-02T10:00:00.000Z",
          source_objects: [{ id: "predictions/prov-pred" }],
          target_objects: [{ id: "predictions/prov-pred" }],
          tags: ["ai", "provenance", "predictions"],
        },
      };
      writeJsonState(join(root, ".proposal-queue.json"), { proposals: [proposal] });
      const result = spawnSync("tsx", [SCRIPT], {
        cwd: root,
        input: "a",
        encoding: "utf8",
        timeout: 30_000,
      });
      expect(result.status).toBe(0);
      const queue = JSON.parse(readFileSync(join(root, ".proposal-queue.json"), "utf8")) as {
        proposals: unknown[];
      };
      expect(queue.proposals).toHaveLength(0);
      const provenanceFiles = readdirSync(join(root, "content", "provenance"));
      expect(provenanceFiles).toHaveLength(1);
      const provenance = readFileSync(
        join(root, "content", "provenance", provenanceFiles[0]!),
        "utf8",
      );
      expect(provenance).toContain("provider: ollama");
      expect(provenance).toContain('model: "glm-5.1:cloud"');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  describe("--dry-run preserves queue", () => {
    it("queue file is unchanged after --dry-run with a registered-handler proposal", () => {
      const root = mkdtempSync(join(tmpdir(), "review-proposals-int-"));
      try {
        const proposal: QueuedProposal = {
          id: "persist-me",
          source: "dormant-flip",
          type: "project-flip-dormant",
          createdAt: "2026-01-01T00:00:00.000Z",
          target: "content/projects/some-project.md",
          title: "Flip some-project dormant",
          preview: "Inactive for 60 days.",
          payload: { daysSinceTouched: 60, thresholdDays: 60, lastTouchedISO: null },
        };
        writeJsonState(join(root, ".proposal-queue.json"), { proposals: [proposal] });
        spawnSync("tsx", [SCRIPT, "--dry-run"], { cwd: root, encoding: "utf8", timeout: 30_000 });
        /** Queue file must still exist and still contain the proposal since --dry-run removes nothing. */
        expect(existsSync(join(root, ".proposal-queue.json"))).toBe(true);
        const contents = JSON.parse(readFileSync(join(root, ".proposal-queue.json"), "utf8")) as {
          proposals: unknown[];
        };
        expect(contents.proposals).toHaveLength(1);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }, 30_000);
  });
});
