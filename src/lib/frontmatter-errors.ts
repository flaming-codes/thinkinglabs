import { relative } from "node:path";

/** Build a path-aware parse error with a concrete next step for malformed YAML frontmatter. */
export function formatFrontmatterParseError(args: {
  readonly kind: string;
  readonly slug: string;
  readonly filePath: string;
  readonly repoRoot?: string;
  readonly error: unknown;
}): string {
  const relPath = args.repoRoot ? relative(args.repoRoot, args.filePath) : args.filePath;
  const message = args.error instanceof Error ? args.error.message : String(args.error);
  return `${args.kind}/${args.slug} (${relPath}): frontmatter parse error: ${message}. Fix the YAML between the leading and trailing --- delimiters.`;
}
