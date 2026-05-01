import { patchFrontmatter } from "./frontmatter.ts";

/** Adds `claimSlug` to the `claims:` array of `thoughtPath` (idempotent); writes back deterministically. */
export async function addClaimBacklink(thoughtPath: string, claimSlug: string): Promise<void> {
  await patchFrontmatter(thoughtPath, (data) => {
    const existing: string[] = Array.isArray(data["claims"]) ? (data["claims"] as string[]) : [];
    if (existing.includes(claimSlug)) return;
    data["claims"] = [...existing, claimSlug];
  });
}
