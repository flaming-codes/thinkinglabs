import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { daysBetween, nowISO } from "../src/lib/clock.ts";

describe("nowISO", () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env["BUILD_NOW_ISO"];
  });

  afterEach(() => {
    if (saved === undefined) delete process.env["BUILD_NOW_ISO"];
    else process.env["BUILD_NOW_ISO"] = saved;
  });

  /** Returns BUILD_NOW_ISO when set. */
  it("returns BUILD_NOW_ISO when set", () => {
    process.env["BUILD_NOW_ISO"] = "2026-01-01T00:00:00.000Z";
    expect(nowISO()).toBe("2026-01-01T00:00:00.000Z");
  });

  /** Returns a fresh ISO string when BUILD_NOW_ISO is unset. */
  it("returns a fresh ISO string when BUILD_NOW_ISO is unset", () => {
    delete process.env["BUILD_NOW_ISO"];
    const before = Date.now();
    const result = nowISO();
    const after = Date.now();
    const ts = Date.parse(result);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe("daysBetween", () => {
  /** Returns 90 days between 2026-01-01 and 2026-04-01. */
  it("returns 90 for 2026-01-01 to 2026-04-01", () => {
    expect(daysBetween("2026-01-01T00:00:00.000Z", "2026-04-01T00:00:00.000Z")).toBe(90);
  });

  /** Floors partial days rather than rounding. */
  it("floors partial days", () => {
    expect(daysBetween("2026-01-01T00:00:00.000Z", "2026-01-01T23:59:59.999Z")).toBe(0);
    expect(daysBetween("2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z")).toBe(1);
  });

  /** Returns 0 for identical timestamps. */
  it("returns 0 for identical timestamps", () => {
    expect(daysBetween("2026-06-15T12:00:00.000Z", "2026-06-15T12:00:00.000Z")).toBe(0);
  });
});
