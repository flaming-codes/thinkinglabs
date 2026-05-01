/** Current time as ISO string; honors BUILD_NOW_ISO for deterministic tests and CI. */
export function nowISO(): string {
  return process.env["BUILD_NOW_ISO"] ?? new Date().toISOString();
}

/** Whole days between two ISO timestamps; floors via UTC milliseconds for monotonic intent. */
export function daysBetween(fromISO: string, toISO: string): number {
  const from = Date.parse(fromISO);
  const to = Date.parse(toISO);
  return Math.floor((to - from) / 86400000);
}
