import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

/** Writes a minimal post with one stamped section; returns the absolute path. */
function writePost(dir: string, slug: string): string {
  const path = join(dir, `${slug}.md`);
  writeFileSync(
    path,
    `---\ntitle: ${slug}\ncreated: 2025-01-01\nupdated: 2025-01-01\ntags: []\nrelated_claims: []\nrelated_thoughts: []\n---\n\n## Old Section {#old last_verified="2025-12-31"}\n\nContent here.\n`,
    "utf8",
  );
  return path;
}

/** Builds a minimal post-section-restamp QueuedProposal. */
function makeProposal(
  target: string,
  recommendation: "confirm-still-true" | "revise" | "deprecate" = "confirm-still-true",
): import("../../src/lib/proposal-queue.ts").QueuedProposal & {
  payload: import("../../src/lib/agents/freshness-review.ts").PostSectionRestampPayload;
} {
  const payload = {
    postSlug: "test-post",
    sectionAnchor: "old",
    sectionHeading: "Old Section",
    lastVerifiedISO: "2025-12-31",
    daysSinceVerified: 120,
    whatMayHaveChanged: "Things may have changed.",
    recommendation,
    reasoning: "120 days old.",
  };
  return {
    id: "test-restamp-id",
    source: "freshness-review",
    type: "post-section-restamp",
    createdAt: "2026-04-30T00:00:00.000Z",
    target,
    title: "Restamp test-post#old",
    preview: "test-post § Old Section — 120 days.",
    payload,
  };
}

describe("post-section-restamp handler", () => {
  let root = "";
  let postsDir = "";

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "freshness-handler-"));
    postsDir = join(root, "content", "posts");
    mkdirSync(postsDir, { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(root);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    rmSync(root, { recursive: true, force: true });
  });

  it("confirm-still-true: updates the last_verified stamp date in body", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/freshness-review.ts");
    const target = writePost(postsDir, "confirm-post");
    const proposal = makeProposal(target, "confirm-still-true");
    const handler = getHandler("post-section-restamp");
    await handler.apply(proposal);
    const content = readFileSync(target, "utf8");
    expect(content).not.toContain('last_verified="2025-12-31"');
    expect(content).toMatch(/last_verified="\d{4}-\d{2}-\d{2}"/);
  });

  it("confirm-still-true: frontmatter is preserved unchanged", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/freshness-review.ts");
    const target = writePost(postsDir, "fm-preserve-post");
    const proposal = makeProposal(target, "confirm-still-true");
    const handler = getHandler("post-section-restamp");
    await handler.apply(proposal);
    const content = readFileSync(target, "utf8");
    expect(content).toContain("title: fm-preserve-post");
  });

  it("deprecate: prepends a deprecated callout to the section", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/freshness-review.ts");
    const target = writePost(postsDir, "deprecate-post");
    const proposal = makeProposal(target, "deprecate");
    const handler = getHandler("post-section-restamp");
    await handler.apply(proposal);
    const content = readFileSync(target, "utf8");
    expect(content).toContain("Deprecated");
  });

  it("revise: opens $EDITOR (EDITOR=cat) and returns summary", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/freshness-review.ts");
    const target = writePost(postsDir, "revise-post");
    const proposal = makeProposal(target, "revise");
    const prev = process.env["EDITOR"];
    process.env["EDITOR"] = "cat";
    try {
      const handler = getHandler("post-section-restamp");
      const result = await handler.apply(proposal);
      expect(result).toContain("revise-post");
    } finally {
      if (prev === undefined) delete process.env["EDITOR"];
      else process.env["EDITOR"] = prev;
    }
  });

  it("edit: opens $EDITOR (EDITOR=cat) and returns summary", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/freshness-review.ts");
    const target = writePost(postsDir, "edit-post");
    const proposal = makeProposal(target, "confirm-still-true");
    const prev = process.env["EDITOR"];
    process.env["EDITOR"] = "cat";
    try {
      const handler = getHandler("post-section-restamp");
      const result = await handler.edit(proposal);
      expect(result).toContain("edit-post");
    } finally {
      if (prev === undefined) delete process.env["EDITOR"];
      else process.env["EDITOR"] = prev;
    }
  });

  it("reject: resolves without persistence (in-memory only)", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/freshness-review.ts");
    const target = writePost(postsDir, "reject-post");
    const proposal = makeProposal(target, "confirm-still-true");
    const handler = getHandler("post-section-restamp");
    if (handler.reject) await expect(handler.reject(proposal)).resolves.toBeUndefined();
  });

  it("apply throws when target is null", async () => {
    const { getHandler } = await import("../../src/lib/proposal-dispatch.ts");
    await import("../../src/lib/agents/freshness-review.ts");
    const proposal = makeProposal("/dev/null", "confirm-still-true");
    const noTarget = { ...proposal, target: null };
    const handler = getHandler("post-section-restamp");
    await expect(handler.apply(noTarget)).rejects.toThrow("missing target path");
  });
});
