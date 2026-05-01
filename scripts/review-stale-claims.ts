#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { editInEditor } from "../src/lib/editor.ts";
import { patchFrontmatter } from "../src/lib/frontmatter.ts";
import { readJsonState, writeJsonState } from "../src/lib/json-state.ts";
import { detectStaleClaims, type StaleFlag } from "../src/lib/review-stale-claims.ts";
import { runReview, type ReviewActionDef, type ReviewProposal } from "../src/lib/review-cli.ts";
import { claimSchema } from "../src/schemas/claim.ts";

/** CLI args shape. */
interface Args {
  readonly thresholdDays: number;
  readonly noLlm: boolean;
  readonly dryRun: boolean;
  readonly limit: number;
  readonly noEditOnDeprecate: boolean;
}

/** Per-run tally for the summary line. */
interface Tally {
  confirmed: number;
  revised: number;
  deprecated: number;
  skipped: number;
}

/** Shape written to `.stale-review-deferrals.json`. */
type DeferralStore = Array<{ slug: string; deferredAt: string }>;

const ROOT = resolve(process.cwd());
const DEFERRALS_FILE = join(ROOT, ".stale-review-deferrals.json");


/** Parses CLI args from process.argv. */
function parseArgs(argv: ReadonlyArray<string>): Args {
  let thresholdDays = 90;
  let noLlm = false;
  let dryRun = false;
  let limit = 25;
  let noEditOnDeprecate = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--no-llm") noLlm = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--no-edit-on-deprecate") noEditOnDeprecate = true;
    else if (a === "--threshold") {
      const next = argv[i + 1];
      if (!next) throw Object.assign(new Error("--threshold requires a value"), { exitCode: 2 });
      const n = Number(next);
      if (!Number.isFinite(n) || n < 1) throw Object.assign(new Error(`invalid --threshold: ${next}`), { exitCode: 2 });
      thresholdDays = n;
      i++;
    } else if (a.startsWith("--threshold=")) {
      const n = Number(a.slice("--threshold=".length));
      if (!Number.isFinite(n) || n < 1) throw Object.assign(new Error(`invalid --threshold value`), { exitCode: 2 });
      thresholdDays = n;
    } else if (a === "--limit") {
      const next = argv[i + 1];
      if (!next) throw Object.assign(new Error("--limit requires a value"), { exitCode: 2 });
      const n = Number(next);
      if (!Number.isFinite(n) || n < 1) throw Object.assign(new Error(`invalid --limit: ${next}`), { exitCode: 2 });
      limit = n;
      i++;
    } else if (a.startsWith("--limit=")) {
      const n = Number(a.slice("--limit=".length));
      if (!Number.isFinite(n) || n < 1) throw Object.assign(new Error(`invalid --limit value`), { exitCode: 2 });
      limit = n;
    } else {
      throw Object.assign(new Error(`unknown arg: ${a}`), { exitCode: 2 });
    }
  }
  return { thresholdDays, noLlm, dryRun, limit, noEditOnDeprecate };
}

/** Build the preview string shown to the reviewer for each flag. */
function buildPreview(flag: StaleFlag): string {
  const lines: string[] = [
    `path: ${flag.path}`,
    `last_reviewed: ${flag.lastReviewedISO} (${flag.daysSinceReview} days ago)`,
    `reasons: ${flag.reasons.join(", ")}`,
  ];
  for (const note of flag.notes) lines.push(`  - ${note}`);
  if (flag.relatedNewerObjects.length > 0) {
    lines.push(`related newer objects (${flag.relatedNewerObjects.length}):`);
    for (const o of flag.relatedNewerObjects.slice(0, 5)) lines.push(`  - ${o.kind}/${o.slug} (${o.touchedISO.slice(0, 10)})`);
  }
  return lines.join("\n");
}

/** CLI entry point. */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const nowISO = new Date().toISOString();
  const contentRoot = join(ROOT, "content");

  const deferrals = readJsonState<DeferralStore>(DEFERRALS_FILE, []);
  const tally: Tally = { confirmed: 0, revised: 0, deprecated: 0, skipped: 0 };

  const allFlags = await detectStaleClaims({
    cwd: ROOT,
    contentRoot,
    nowISO,
    thresholdDays: args.thresholdDays,
    skipLLM: args.noLlm,
  });

  const flags = allFlags.slice(0, args.limit);

  if (flags.length === 0) {
    process.stdout.write(`0 flags, 0 confirmed, 0 revised, 0 deprecated, 0 skipped\n`);
    return;
  }

  const proposals: ReviewProposal<StaleFlag>[] = flags.map((flag) => ({
    id: flag.slug,
    title: `Stale claim: ${flag.slug}`,
    preview: buildPreview(flag),
    payload: flag,
  }));

  const actions: ReviewActionDef<StaleFlag, string>[] = [
    {
      key: "c",
      label: "confirm-still-true",
      handle: async (flag) => {
        if (!args.dryRun) {
          await patchFrontmatter(flag.path, (data) => { data["last_reviewed"] = nowISO.slice(0, 10); });
        } else {
          process.stdout.write(`[dry-run] would bump last_reviewed on ${flag.slug}\n`);
        }
        tally.confirmed++;
        return "confirmed";
      },
    },
    {
      key: "r",
      label: "revise",
      handle: async (flag) => {
        const raw = readFileSync(flag.path, "utf8");
        let edited = raw;
        let valid = false;
        while (!valid) {
          edited = await editInEditor(edited, ".md");
          let parsed: ReturnType<typeof matter>;
          try {
            parsed = matter(edited);
          } catch (err) {
            process.stderr.write(`YAML parse error: ${(err as Error).message}\nRe-opening editor...\n`);
            continue;
          }
          const result = claimSchema.safeParse(parsed.data);
          if (result.success) {
            valid = true;
          } else {
            process.stderr.write(`Validation error: ${result.error.message}\nRe-opening editor...\n`);
          }
        }
        if (!args.dryRun) {
          const parsedEdited = matter(edited);
          const lastReviewed = parsedEdited.data["last_reviewed"];
          if (!lastReviewed || lastReviewed === flag.lastReviewedISO || String(lastReviewed) === flag.lastReviewedISO.slice(0, 10)) {
            writeFileSync(flag.path, edited, "utf8");
            await patchFrontmatter(flag.path, (data) => { data["last_reviewed"] = nowISO.slice(0, 10); });
          } else {
            writeFileSync(flag.path, edited, "utf8");
          }
        } else {
          process.stdout.write(`[dry-run] would write revised ${flag.slug}\n`);
        }
        tally.revised++;
        return "revised";
      },
    },
    {
      key: "d",
      label: "deprecate",
      handle: async (flag) => {
        if (!args.dryRun) {
          await patchFrontmatter(flag.path, (data) => {
            data["status"] = "deprecated";
            data["last_reviewed"] = nowISO.slice(0, 10);
          });
          if (!args.noEditOnDeprecate) {
            const raw = readFileSync(flag.path, "utf8");
            const afterEdit = await editInEditor(raw, ".md");
            const parsedAfter = matter(afterEdit);
            const result = claimSchema.safeParse(parsedAfter.data);
            if (result.success) {
              writeFileSync(flag.path, afterEdit, "utf8");
            } else {
              process.stderr.write(`Validation error after deprecation edit — keeping status flip only.\n`);
            }
          }
        } else {
          process.stdout.write(`[dry-run] would set status=deprecated and bump last_reviewed on ${flag.slug}\n`);
        }
        tally.deprecated++;
        return "deprecated";
      },
    },
    {
      key: "s",
      label: "skip",
      handle: (flag) => {
        const alreadyDeferred = deferrals.some((d) => d.slug === flag.slug);
        if (!alreadyDeferred) deferrals.push({ slug: flag.slug, deferredAt: nowISO });
        if (!args.dryRun) writeJsonState(DEFERRALS_FILE, deferrals);
        else process.stdout.write(`[dry-run] would defer ${flag.slug}\n`);
        tally.skipped++;
        return Promise.resolve("skipped");
      },
    },
  ];

  const handleSignal = (): void => {
    process.stdout.write(
      `\nAborted. ${tally.confirmed} confirmed, ${tally.revised} revised, ${tally.deprecated} deprecated, ${tally.skipped} skipped\n`,
    );
    process.exit(1);
  };
  process.once("SIGINT", handleSignal);

  await runReview(proposals, actions);

  process.stdout.write(
    `${flags.length} flags, ${tally.confirmed} confirmed, ${tally.revised} revised, ${tally.deprecated} deprecated, ${tally.skipped} skipped\n`,
  );
}

main().catch((e: unknown) => {
  const err = e as { message?: string; exitCode?: number };
  process.stderr.write(`${err.message ?? String(e)}\n`);
  process.exit(err.exitCode ?? 1);
});
