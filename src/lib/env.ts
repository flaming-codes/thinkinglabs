import { z } from "zod";

/** Zod schema for every environment variable read across the codebase; defaults are documented per-field. */
const envSchema = z.object({
  /** Canonical public site URL; used by Astro, structured-data checks, feed builders, and MCP handlers. */
  SITE_URL: z.url().default("https://thinkinglabs.run"),
  /** Optional repo-root override for the MCP server when invoked from another working directory. */
  THINKINGLABS_MCP_REPO_ROOT: z.string().optional(),
  /** Frozen "now" for deterministic builds; ISO-8601. Falls back to `new Date().toISOString()` when absent. */
  BUILD_NOW_ISO: z.string().optional(),
  /** Frozen "now" for the freshness pipeline; ISO-8601. Independent of `BUILD_NOW_ISO`. */
  FRESHNESS_NOW_ISO: z.string().optional(),
  /** LLM provider selector; consumed by `src/lib/llm.ts`. */
  LLM_PROVIDER: z.enum(["openai", "ollama"]).default("openai"),
});

/** Inferred type of the validated environment; consumers import this rather than reading `process.env` directly. */
export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Lazy, cached parse of `process.env` against `envSchema`; re-call only after deliberate env mutation in tests. */
export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`env: invalid environment — ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Reset the cache; intended for tests that mutate `process.env` between cases. */
export function resetEnvCache(): void {
  cached = null;
}
