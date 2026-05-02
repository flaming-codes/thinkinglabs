#!/usr/bin/env tsx
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { addClaimBacklink } from "../src/lib/backlinks.ts";
import {
  proposeClaimsForThought,
  proposalToClaimFile,
  type ClaimProposal,
} from "../src/lib/derive-claims.ts";
import { editInEditor } from "../src/lib/editor.ts";
import { patchFrontmatter } from "../src/lib/frontmatter.ts";
import { readJsonState, writeJsonState } from "../src/lib/json-state.ts";
import { runReview, type ReviewActionDef, type ReviewProposal } from "../src/lib/review-cli.ts";
import { claimSchema } from "../src/schemas/claim.ts";
import { resolveLlmMode, runMain } from "../src/lib/cli.ts";
import { objectRef, writeProvenanceEvent } from "../src/lib/provenance.ts";

/** CLI args shape. */
interface Args {
  readonly thoughts: string[];
  readonly all: boolean;
  readonly noLlm: boolean;
  readonly dryRun: boolean;
}

/** Per-run tally for the summary line. */
interface Tally {
  accepted: number;
  edited: number;
  rejected: number;
  deferred: number;
  merged: number;
}

/** Shape written to `.derivation-state.json`. */
interface DerivationState {
  [thoughtSlug: string]: { lastProcessedAt: string; lastModifiedSeen: string };
}

/** Shape written to `.derivation-rejections.json`. */
type RejectionStore = string[];

/** Shape written to `.derivation-deferrals.json`. */
type DeferralStore = Array<{ thoughtSlug: string; proposal: ClaimProposal }>;

const ROOT = resolve(process.cwd());
const THOUGHTS_DIR = join(ROOT, "content", "thoughts");
const CLAIMS_DIR = join(ROOT, "content", "claims");
const STATE_FILE = join(ROOT, ".derivation-state.json");
const REJECTIONS_FILE = join(ROOT, ".derivation-rejections.json");
const DEFERRALS_FILE = join(ROOT, ".derivation-deferrals.json");

/** Stable hash for (thoughtSlug, claimText) used to track rejections across runs. */
export function rejectionHash(thoughtSlug: string, claimText: string): string {
  return createHash("sha256").update(`${thoughtSlug}\0${claimText}`).digest("hex").slice(0, 16);
}

/** Loads all existing claims from content/claims/ for merge-candidate input. */
function loadExistingClaims(): Array<{
  slug: string;
  claim: string;
  confidence: number;
  tags: ReadonlyArray<string>;
}> {
  if (!existsSync(CLAIMS_DIR)) return [];
  return readdirSync(CLAIMS_DIR)
    .filter((f) => f.endsWith(".md"))
    .flatMap((f) => {
      try {
        const parsed = matter(readFileSync(join(CLAIMS_DIR, f), "utf8"));
        const slug = f.slice(0, -3);
        const claim = typeof parsed.data["claim"] === "string" ? parsed.data["claim"] : "";
        const confidence =
          typeof parsed.data["confidence"] === "number" ? parsed.data["confidence"] : 0;
        const tags = Array.isArray(parsed.data["tags"]) ? (parsed.data["tags"] as string[]) : [];
        return [{ slug, claim, confidence, tags }];
      } catch {
        return [];
      }
    });
}

/** Parses args from process.argv. */
function parseArgs(argv: ReadonlyArray<string>): Args {
  const thoughts: string[] = [];
  let all = false;
  let noLlm = false;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--all") all = true;
    else if (a === "--no-llm") noLlm = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--thought") {
      const next = argv[i + 1];
      if (!next) throw new Error("--thought requires a value");
      thoughts.push(next);
      i++;
    } else if (a.startsWith("--thought=")) {
      thoughts.push(a.slice("--thought=".length));
    } else {
      throw new Error(`unknown arg: ${a}`);
    }
  }
  return { thoughts, all, noLlm, dryRun };
}

/** Resolves a slug-or-path to a full path inside THOUGHTS_DIR; throws with exit code 2 semantics. */
function resolveThoughtPath(slugOrPath: string): string {
  if (slugOrPath.endsWith(".md") && existsSync(slugOrPath)) return resolve(slugOrPath);
  const candidate = join(
    THOUGHTS_DIR,
    slugOrPath.endsWith(".md") ? slugOrPath : `${slugOrPath}.md`,
  );
  if (!existsSync(candidate))
    throw Object.assign(new Error(`thought not found: ${slugOrPath}`), { exitCode: 2 });
  return candidate;
}

/** Returns the list of thought paths to process given parsed args and state. */
function collectThoughtPaths(args: Args, state: DerivationState): string[] {
  if (args.all) {
    if (!existsSync(THOUGHTS_DIR)) return [];
    return readdirSync(THOUGHTS_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => join(THOUGHTS_DIR, f))
      .filter((p) => {
        const slug = p.split("/").pop()!.slice(0, -3);
        const entry = state[slug];
        if (!entry) return true;
        const mtime = statSync(p).mtime.toISOString();
        return entry.lastProcessedAt < mtime;
      });
  }
  return args.thoughts.map(resolveThoughtPath);
}

/** Merges evidence and opposing from a proposal into an existing claim file. */
async function mergeIntoExistingClaim(
  claimPath: string,
  proposal: ClaimProposal,
  nowISO: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    process.stdout.write(`[dry-run] would merge evidence into ${claimPath}\n`);
    return;
  }
  await patchFrontmatter(claimPath, (data) => {
    const ev: Array<{ url?: string; note?: string }> = Array.isArray(data["evidence"])
      ? (data["evidence"] as Array<{ url?: string; note?: string }>)
      : [];
    for (const e of proposal.evidence) ev.push(e);
    const opp: string[] = Array.isArray(data["opposing"]) ? (data["opposing"] as string[]) : [];
    for (const o of proposal.opposing) {
      if (!opp.includes(o)) opp.push(o);
    }
    data["evidence"] = ev;
    data["opposing"] = opp;
    data["last_reviewed"] = nowISO.slice(0, 10);
  });
}

/** CLI entry point. */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const effectiveNoLlm = resolveLlmMode("derive-claims", args.noLlm) === "no-llm";

  const state = readJsonState<DerivationState>(STATE_FILE, {});
  const rejections = readJsonState<RejectionStore>(REJECTIONS_FILE, []);
  const deferrals = readJsonState<DeferralStore>(DEFERRALS_FILE, []);
  const existingClaims = loadExistingClaims();
  const tally: Tally = { accepted: 0, edited: 0, rejected: 0, deferred: 0, merged: 0 };
  const nowISO = new Date().toISOString();

  const thoughtPaths = collectThoughtPaths(args, state);
  let totalProposals = 0;

  if (!existsSync(CLAIMS_DIR) && !args.dryRun) mkdirSync(CLAIMS_DIR, { recursive: true });

  for (const thoughtPath of thoughtPaths) {
    const slug = thoughtPath.split("/").pop()!.slice(0, -3);
    const parsed = matter(readFileSync(thoughtPath, "utf8"));
    const thoughtBody = parsed.content;
    const thoughtFrontmatter = parsed.data as Record<string, unknown>;

    const allProposals = await proposeClaimsForThought({
      thoughtSlug: slug,
      thoughtBody,
      thoughtFrontmatter,
      existingClaims,
      skipLLM: effectiveNoLlm,
    });

    const pendingDeferrals = deferrals.filter((d) => d.thoughtSlug === slug).map((d) => d.proposal);
    const candidates = [...allProposals, ...pendingDeferrals].filter(
      (p) => !rejections.includes(rejectionHash(slug, p.claim)),
    );
    totalProposals += candidates.length;

    if (candidates.length === 0) {
      if (!args.dryRun) {
        state[slug] = {
          lastProcessedAt: nowISO,
          lastModifiedSeen: statSync(thoughtPath).mtime.toISOString(),
        };
      }
      continue;
    }

    const proposals: ReviewProposal<ClaimProposal>[] = candidates.map((p) => ({
      id: rejectionHash(slug, p.claim),
      title: `Claim: ${p.suggestedSlug}`,
      preview: `"${p.claim}"\nconfidence: ${p.confidence}\nreasoning: ${p.reasoning}${p.mergeCandidates.length > 0 ? `\nmerge candidates: ${p.mergeCandidates.map((m) => m.slug).join(", ")}` : ""}`,
      payload: p,
    }));

    const writeDerivationProvenance = (
      payload: ClaimProposal,
      targetSlug: string,
      outcome: "accepted" | "edited" | "merged",
    ): void => {
      if (!payload.model) return;
      writeProvenanceEvent({
        cwd: ROOT,
        title: `AI provenance for derived claim ${targetSlug}`,
        process_id: "derive-claims",
        event_type: "content_derivation",
        actor: { kind: "llm", model: payload.model },
        started_at: nowISO,
        accepted_at: new Date().toISOString(),
        source_objects: [objectRef("thoughts", slug)],
        target_objects: [objectRef("claims", targetSlug)],
        outcome,
        tags: ["ai", "provenance", "claims"],
      });
    };

    const actions: ReviewActionDef<ClaimProposal, string>[] = [
      {
        key: "a",
        label: "accept",
        handle: async (payload) => {
          const { slug: cSlug, markdown } = proposalToClaimFile(payload, slug, nowISO);
          const claimPath = join(CLAIMS_DIR, `${cSlug}.md`);
          if (!args.dryRun) {
            writeFileSync(claimPath, markdown, "utf8");
            await addClaimBacklink(thoughtPath, cSlug);
            writeDerivationProvenance(payload, cSlug, "accepted");
          } else {
            process.stdout.write(`[dry-run] would write ${claimPath}\n`);
            process.stdout.write(`[dry-run] would backlink ${slug} -> ${cSlug}\n`);
          }
          tally.accepted++;
          return "accepted";
        },
      },
      {
        key: "e",
        label: "edit",
        handle: async (payload) => {
          const { slug: cSlug, markdown } = proposalToClaimFile(payload, slug, nowISO);
          let edited = markdown;
          let valid = false;
          while (!valid) {
            edited = await editInEditor(edited, ".yaml");
            let parsed: ReturnType<typeof matter>;
            try {
              parsed = matter(edited);
            } catch (err) {
              process.stderr.write(
                `YAML parse error: ${(err as Error).message}\nRe-opening editor...\n`,
              );
              continue;
            }
            const result = claimSchema.safeParse(parsed.data);
            if (result.success) {
              valid = true;
            } else {
              process.stderr.write(
                `Validation error: ${result.error.message}\nRe-opening editor...\n`,
              );
            }
          }
          const claimPath = join(CLAIMS_DIR, `${cSlug}.md`);
          if (!args.dryRun) {
            writeFileSync(claimPath, edited, "utf8");
            await addClaimBacklink(thoughtPath, cSlug);
            writeDerivationProvenance(payload, cSlug, "edited");
          } else {
            process.stdout.write(`[dry-run] would write edited ${claimPath}\n`);
          }
          tally.edited++;
          return "edited";
        },
      },
      {
        key: "r",
        label: "reject",
        handle: (payload) => {
          const hash = rejectionHash(slug, payload.claim);
          if (!rejections.includes(hash)) rejections.push(hash);
          if (!args.dryRun) writeJsonState(REJECTIONS_FILE, rejections);
          tally.rejected++;
          return Promise.resolve("rejected");
        },
      },
      {
        key: "d",
        label: "defer",
        handle: (payload) => {
          const existing = deferrals.findIndex(
            (d) => d.thoughtSlug === slug && d.proposal.claim === payload.claim,
          );
          if (existing === -1) deferrals.push({ thoughtSlug: slug, proposal: payload });
          if (!args.dryRun) writeJsonState(DEFERRALS_FILE, deferrals);
          tally.deferred++;
          return Promise.resolve("deferred");
        },
      },
      {
        key: "m",
        label: "merge",
        handle: async (payload) => {
          let targetSlug: string;
          if (payload.mergeCandidates.length > 0) {
            process.stdout.write(
              `Merge candidates:\n${payload.mergeCandidates.map((c, i) => `  ${i + 1}. ${c.slug} — ${c.reason}`).join("\n")}\nEnter slug to merge into: `,
            );
            targetSlug = payload.mergeCandidates[0]!.slug;
          } else {
            process.stdout.write("Enter slug of existing claim to merge into: ");
            targetSlug = "";
          }
          const claimPath = join(CLAIMS_DIR, `${targetSlug}.md`);
          if (targetSlug && existsSync(claimPath)) {
            await mergeIntoExistingClaim(claimPath, payload, nowISO, args.dryRun);
            if (!args.dryRun) {
              await addClaimBacklink(thoughtPath, targetSlug);
              writeDerivationProvenance(payload, targetSlug, "merged");
            }
          } else {
            process.stderr.write(`Claim '${targetSlug}' not found; skipping merge.\n`);
          }
          tally.merged++;
          return "merged";
        },
      },
    ];

    await runReview(proposals, actions);

    if (!args.dryRun) {
      state[slug] = {
        lastProcessedAt: nowISO,
        lastModifiedSeen: statSync(thoughtPath).mtime.toISOString(),
      };
      writeJsonState(STATE_FILE, state);
    }
  }

  process.stdout.write(
    `processed ${thoughtPaths.length} thoughts, ${totalProposals} proposals, ` +
      `${tally.accepted} accepted, ${tally.edited} edited, ${tally.rejected} rejected, ` +
      `${tally.deferred} deferred, ${tally.merged} merged\n`,
  );
}

runMain(main);
