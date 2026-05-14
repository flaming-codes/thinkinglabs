#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runMain } from "../src/lib/cli.ts";
import {
  createLinkedInDryRun,
  DEFAULT_LINKEDIN_VERSION,
  publishLinkedInTextPost,
} from "../src/lib/linkedin-post.ts";

interface Args {
  readonly authorUrn: string;
  readonly message: string;
  readonly version: string | undefined;
  readonly dryRun: boolean;
  readonly yes: boolean;
}

function usage(): string {
  return `Usage: pnpm linkedin:post [--message <text> | --file <path>] [--author <urn>] [--version <YYYYMM>] [--dry-run] [--yes]

Environment:
  LINKEDIN_ACCESS_TOKEN  OAuth token with w_member_social or w_organization_social
  LINKEDIN_AUTHOR_URN    urn:li:person:{id} or urn:li:organization:{id}
  LINKEDIN_VERSION       Optional LinkedIn API version, defaults to ${DEFAULT_LINKEDIN_VERSION}
`;
}

async function parseArgs(argv: ReadonlyArray<string>): Promise<Args> {
  let authorUrn = process.env["LINKEDIN_AUTHOR_URN"];
  let version = process.env["LINKEDIN_VERSION"];
  let message: string | undefined;
  let file: string | undefined;
  let dryRun = false;
  let yes = false;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(usage());
      process.exit(0);
    } else if (arg === "--message") {
      message = requireValue(argv, ++i, "--message");
    } else if (arg.startsWith("--message=")) {
      message = arg.slice("--message=".length);
    } else if (arg === "--file") {
      file = requireValue(argv, ++i, "--file");
    } else if (arg.startsWith("--file=")) {
      file = arg.slice("--file=".length);
    } else if (arg === "--author") {
      authorUrn = requireValue(argv, ++i, "--author");
    } else if (arg.startsWith("--author=")) {
      authorUrn = arg.slice("--author=".length);
    } else if (arg === "--version") {
      version = requireValue(argv, ++i, "--version");
    } else if (arg.startsWith("--version=")) {
      version = arg.slice("--version=".length);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--yes") {
      yes = true;
    } else if (arg.startsWith("-")) {
      throw Object.assign(new Error(`unknown arg: ${arg}`), { exitCode: 2 });
    } else {
      positional.push(arg);
    }
  }

  if (message && file) {
    throw Object.assign(new Error("use either --message or --file, not both"), { exitCode: 2 });
  }
  if (message && positional.length > 0) {
    throw Object.assign(new Error("use either --message or positional text, not both"), {
      exitCode: 2,
    });
  }
  if (file && positional.length > 0) {
    throw Object.assign(new Error("use either --file or positional text, not both"), {
      exitCode: 2,
    });
  }
  if (!authorUrn) {
    throw Object.assign(new Error("LINKEDIN_AUTHOR_URN or --author is required"), { exitCode: 2 });
  }

  const resolvedMessage =
    message ?? (file ? await readFile(resolve(file), "utf8") : positional.join(" "));
  if (!resolvedMessage) {
    throw Object.assign(new Error("message text is required"), { exitCode: 2 });
  }

  return {
    authorUrn,
    message: resolvedMessage,
    version,
    dryRun,
    yes,
  };
}

function requireValue(argv: ReadonlyArray<string>, index: number, flag: string): string {
  const value = argv[index];
  if (!value) throw Object.assign(new Error(`${flag} requires a value`), { exitCode: 2 });
  return value;
}

async function main(): Promise<void> {
  const args = await parseArgs(process.argv.slice(2));
  const dryRun = createLinkedInDryRun({
    authorUrn: args.authorUrn,
    message: args.message,
    version: args.version,
  });

  if (args.dryRun || !args.yes) {
    process.stdout.write(`${JSON.stringify(dryRun, null, 2)}\n`);
    if (!args.yes) {
      process.stdout.write("Dry run only. Re-run with --yes to publish this post.\n");
    }
    return;
  }

  const accessToken = process.env["LINKEDIN_ACCESS_TOKEN"] ?? "";
  const result = await publishLinkedInTextPost({
    accessToken,
    authorUrn: args.authorUrn,
    message: args.message,
    version: args.version,
  });
  const suffix = result.id ? ` ${result.id}` : "";
  process.stdout.write(`posted${suffix}\n`);
}

runMain(main);
