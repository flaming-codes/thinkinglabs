import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import matter from "gray-matter";
import { describe, expect, it } from "vite-plus/test";
import { runDormantFlip } from "../../src/lib/agents/dormant-flip.ts";
import { writeJsonState } from "../../src/lib/json-state.ts";
import { runProposalsReview } from "../../scripts/review-proposals.ts";
import { readQueue } from "../../src/lib/proposal-queue.ts";

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

/** Absolute path to the scripts. */
const DORMANT_FLIP_SCRIPT = join(process.cwd(), "scripts", "dormant-flip.ts");
const REVIEW_SCRIPT = join(process.cwd(), "scripts", "review-proposals.ts");

/** Frozen "now" so the test is deterministic across runs. Honours BUILD_NOW_ISO. */
const FROZEN_NOW_ISO = process.env["BUILD_NOW_ISO"] ?? "2026-05-02T00:00:00.000Z";
const FROZEN_NOW_MS = new Date(FROZEN_NOW_ISO).getTime();

/** Writes a minimal alive project file with a `last_touched` `daysAgo` before {@link FROZEN_NOW_ISO}. */
function writeProject(dir: string, slug: string, daysAgo: number): string {
  const date = new Date(FROZEN_NOW_MS - daysAgo * 86_400_000).toISOString().slice(0, 10);
  const path = join(dir, `${slug}.md`);
  writeFileSync(
    path,
    `---\ntitle: ${slug}\nstatus: alive\nstarted: 2026-01-01\nlast_touched: ${date}\ntags: []\nlinks: {}\nrelated_thoughts: []\nrelated_claims: []\n---\nBody.\n`,
    "utf8",
  );
  return path;
}

describe("dormant-flip + review-proposals round-trip (integration)", () => {
  it("dormant-flip against empty content tree exits 0 and prints scanned 0", () => {
    const root = mkdtempSync(join(tmpdir(), "rp-int-empty-"));
    try {
      const result = spawnSync("tsx", [DORMANT_FLIP_SCRIPT, "--threshold", "60"], {
        cwd: root,
        encoding: "utf8",
        timeout: 30_000,
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("scanned 0 projects");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  describe("full round-trip with git available", () => {
    it("accept in runProposalsReview mutates project to dormant and drains the queue", async () => {
      const root = mkdtempSync(join(tmpdir(), "rp-int-accept-"));
      const originalCwd = process.cwd();
      try {
        mkdirSync(join(root, "content", "projects"), { recursive: true });
        const projectPath = writeProject(join(root, "content", "projects"), "stale-proj", 100);

        execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
        execFileSync("git", ["config", "user.email", "test@test.com"], {
          cwd: root,
          stdio: "ignore",
        });
        execFileSync("git", ["config", "user.name", "Test"], { cwd: root, stdio: "ignore" });
        execFileSync("git", ["add", "."], { cwd: root, stdio: "ignore" });
        const pastDate = new Date(FROZEN_NOW_MS - 100 * 86_400_000).toISOString();
        execFileSync("git", ["commit", "--date", pastDate, "-m", "init"], {
          cwd: root,
          stdio: "ignore",
          env: { ...process.env, GIT_AUTHOR_DATE: pastDate, GIT_COMMITTER_DATE: pastDate },
        });

        process.chdir(root);
        try {
          const nowISO = FROZEN_NOW_ISO;
          const flipSummary = runDormantFlip({ cwd: root, nowISO, thresholdDays: 60 });
          expect(flipSummary.proposed).toBe(1);

          const queueBefore = readQueue();
          expect(queueBefore).toHaveLength(1);

          const input = new PassThrough();
          const output = new PassThrough();

          const reviewPromise = runProposalsReview({ io: { input, output } });
          input.push("a");
          const summary = await reviewPromise;

          expect(summary.accepted).toBe(1);
          expect(summary.queueSize).toBe(0);

          const { data } = matter(readFileSync(projectPath, "utf8"));
          expect(data["status"]).toBe("dormant");

          const queueAfter = readQueue();
          expect(queueAfter).toHaveLength(0);
        } finally {
          process.chdir(originalCwd);
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }, 30_000);

    it("run dormant-flip, verify queue entry, review-proposals dry-run preserves queue, project stays alive", () => {
      const root = mkdtempSync(join(tmpdir(), "rp-int-roundtrip-"));
      try {
        mkdirSync(join(root, "content", "projects"), { recursive: true });
        const projectPath = writeProject(join(root, "content", "projects"), "stale-project", 100);

        execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
        execFileSync("git", ["config", "user.email", "test@test.com"], {
          cwd: root,
          stdio: "ignore",
        });
        execFileSync("git", ["config", "user.name", "Test"], { cwd: root, stdio: "ignore" });
        execFileSync("git", ["add", "."], { cwd: root, stdio: "ignore" });
        const pastDate = new Date(FROZEN_NOW_MS - 100 * 86_400_000).toISOString();
        execFileSync("git", ["commit", "--date", pastDate, "-m", "init"], {
          cwd: root,
          stdio: "ignore",
          env: { ...process.env, GIT_AUTHOR_DATE: pastDate, GIT_COMMITTER_DATE: pastDate },
        });

        const flipResult = spawnSync("tsx", [DORMANT_FLIP_SCRIPT, "--threshold", "60"], {
          cwd: root,
          encoding: "utf8",
          timeout: 30_000,
        });
        expect(flipResult.status).toBe(0);
        expect(flipResult.stdout).toMatch(/proposed [1-9]/);

        const queueRaw = JSON.parse(readFileSync(join(root, ".proposal-queue.json"), "utf8")) as {
          proposals: unknown[];
        };
        expect(queueRaw.proposals).toHaveLength(1);

        const dryRunResult = spawnSync("tsx", [REVIEW_SCRIPT, "--dry-run"], {
          cwd: root,
          encoding: "utf8",
          timeout: 30_000,
        });
        expect(dryRunResult.status).toBe(0);
        const queueAfterDryRun = JSON.parse(
          readFileSync(join(root, ".proposal-queue.json"), "utf8"),
        ) as { proposals: unknown[] };
        expect(queueAfterDryRun.proposals).toHaveLength(1);

        const { data } = matter(readFileSync(projectPath, "utf8"));
        expect(data["status"]).toBe("alive");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }, 60_000);

    it("does not replay accept side effects when prior run already reached applied state", async () => {
      const root = mkdtempSync(join(tmpdir(), "rp-int-replay-guard-"));
      try {
        const proposal = {
          id: "replay-guard-proposal",
          source: "dormant-flip" as const,
          type: "project-flip-dormant" as const,
          createdAt: "2026-05-02T00:00:00.000Z",
          target: null,
          title: "Replay guard proposal",
          preview: "Should not re-run apply when already marked applied.",
          payload: { daysSinceTouched: 100, thresholdDays: 60, lastTouchedISO: null },
        };
        writeJsonState(join(root, ".proposal-queue.json"), { proposals: [proposal] });
        writeJsonState(join(root, ".review-proposals-state.json"), {
          entries: {
            [proposal.id]: {
              outcome: "accepted",
              phase: "applied",
              provenanceWritten: false,
              updatedAt: "2026-05-02T00:00:00.000Z",
            },
          },
        });

        const input = new PassThrough();
        const output = new PassThrough();
        let stdout = "";
        output.on("data", (chunk) => {
          stdout += String(chunk);
        });

        const reviewPromise = runProposalsReview({ cwd: root, io: { input, output } });
        input.push("a");
        const summary = await reviewPromise;

        expect(summary.accepted).toBe(1);
        expect(summary.queueSize).toBe(0);
        expect(stdout).toContain("already accepted");
        expect(readQueue(root)).toHaveLength(0);
        const state = JSON.parse(
          readFileSync(join(root, ".review-proposals-state.json"), "utf8"),
        ) as {
          entries: Record<string, { phase: string }>;
        };
        expect(state.entries[proposal.id]?.phase).toBe("finalized");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }, 30_000);

    it("refuses to replay when proposal state is stuck in applying phase", async () => {
      const root = mkdtempSync(join(tmpdir(), "rp-int-replay-block-"));
      try {
        const proposal = {
          id: "in-flight-proposal",
          source: "dormant-flip" as const,
          type: "project-flip-dormant" as const,
          createdAt: "2026-05-02T00:00:00.000Z",
          target: null,
          title: "In-flight proposal",
          preview: "Crash left this in applying state.",
          payload: { daysSinceTouched: 100, thresholdDays: 60, lastTouchedISO: null },
        };
        writeJsonState(join(root, ".proposal-queue.json"), { proposals: [proposal] });
        writeJsonState(join(root, ".review-proposals-state.json"), {
          entries: {
            [proposal.id]: {
              outcome: "accepted",
              phase: "applying",
              provenanceWritten: false,
              updatedAt: "2026-05-02T00:00:00.000Z",
            },
          },
        });

        const input = new PassThrough();
        const output = new PassThrough();
        const reviewPromise = runProposalsReview({ cwd: root, io: { input, output } });
        input.push("a");
        await expect(reviewPromise).rejects.toThrow(/already in applying phase/);
        expect(readQueue(root)).toHaveLength(1);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }, 30_000);
  });
});
