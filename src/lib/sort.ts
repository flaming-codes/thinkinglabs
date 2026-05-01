/** Sort by a date-bearing frontmatter field, newest first; tolerates Date or ISO-string values so callers don't normalize. */
export function byDateDesc<T extends { data: Record<string, unknown> }>(items: readonly T[], key: string): T[] {
  const ts = (v: unknown): number => (v instanceof Date ? v.getTime() : typeof v === "string" ? Date.parse(v) : 0);
  return [...items].sort((a, b) => ts(b.data[key]) - ts(a.data[key]));
}
