import { describe, expect, it } from "vite-plus/test";
import { freshnessState } from "../src/lib/freshness.ts";

describe("freshnessState", () => {
  it("returns green for < 30 days", () => {
    expect(freshnessState("2026-04-15", "2026-04-30")).toEqual({ state: "green", daysAgo: 15 });
  });

  it("returns amber in the 30–90 day window", () => {
    expect(freshnessState("2026-02-15", "2026-04-30")).toEqual({ state: "amber", daysAgo: 74 });
  });

  it("returns red past 90 days", () => {
    expect(freshnessState("2025-12-15", "2026-04-30")).toEqual({ state: "red", daysAgo: 136 });
  });

  it("treats 30 days as amber (boundary)", () => {
    expect(freshnessState("2026-03-31", "2026-04-30").state).toBe("amber");
  });

  it("treats 29 days as green (boundary)", () => {
    expect(freshnessState("2026-04-01", "2026-04-30").state).toBe("green");
  });

  it("treats 90 days as amber (boundary)", () => {
    expect(freshnessState("2026-01-30", "2026-04-30").state).toBe("amber");
  });

  it("treats 91 days as red (boundary)", () => {
    expect(freshnessState("2026-01-29", "2026-04-30").state).toBe("red");
  });
});
