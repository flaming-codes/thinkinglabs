/** Day-bucket boundaries for the per-section freshness pill; thresholds are inclusive on the lower side. */
export const FRESHNESS_THRESHOLDS = { greenMaxDays: 30, amberMaxDays: 90 } as const;

/** Pill state computed from a `last_verified` ISO date and a build-time `now`; pure so the rehype plugin and tests share it. */
export function freshnessState(
  verifiedISO: string,
  nowISO: string,
): { state: "green" | "amber" | "red"; daysAgo: number } {
  const v = Date.parse(verifiedISO);
  const n = Date.parse(nowISO);
  const daysAgo = Math.floor((n - v) / 86_400_000);
  const state =
    daysAgo < FRESHNESS_THRESHOLDS.greenMaxDays
      ? "green"
      : daysAgo <= FRESHNESS_THRESHOLDS.amberMaxDays
        ? "amber"
        : "red";
  return { state, daysAgo };
}

/** Resolves the build-time "now" the rehype pill consults; env override exists so tests and local brain-diff runs are deterministic. */
export function freshnessNowISO(): string {
  return process.env["FRESHNESS_NOW_ISO"] ?? new Date().toISOString();
}
