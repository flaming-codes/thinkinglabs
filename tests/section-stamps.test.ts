import { describe, expect, it } from "vitest";
import { parseSectionStamps } from "../src/lib/section-stamps.ts";

describe("parseSectionStamps", () => {
  it("extracts a single stamped heading with anchor and date", () => {
    const md = `## Introduction {#intro last_verified="2026-04-15"}\n\nBody text here.\n`;
    const stamps = parseSectionStamps(md);
    expect(stamps).toHaveLength(1);
    expect(stamps[0]?.headingText).toBe("Introduction");
    expect(stamps[0]?.anchor).toBe("intro");
    expect(stamps[0]?.lastVerifiedISO).toBe("2026-04-15");
  });

  it("returns [] for an unstamped heading", () => {
    const md = `## Plain Heading\n\nNo attribute block here.\n`;
    const stamps = parseSectionStamps(md);
    expect(stamps).toHaveLength(0);
  });

  it("handles multiple stamped headings in one body", () => {
    const md = [
      `## First {#first last_verified="2026-01-01"}`,
      `Content for first.`,
      `## Second {#second last_verified="2026-02-15"}`,
      `Content for second.`,
      `## Third {#third last_verified="2026-03-20"}`,
      `Content for third.`,
    ].join("\n");
    const stamps = parseSectionStamps(md);
    expect(stamps).toHaveLength(3);
    expect(stamps[0]?.anchor).toBe("first");
    expect(stamps[0]?.lastVerifiedISO).toBe("2026-01-01");
    expect(stamps[1]?.anchor).toBe("second");
    expect(stamps[1]?.lastVerifiedISO).toBe("2026-02-15");
    expect(stamps[2]?.anchor).toBe("third");
    expect(stamps[2]?.lastVerifiedISO).toBe("2026-03-20");
  });

  it("ignores headings without last_verified even if they have an id", () => {
    const md = `## Section {#myid}\n\nNo last_verified here.\n`;
    const stamps = parseSectionStamps(md);
    expect(stamps).toHaveLength(0);
  });

  it("falls back to heading text as anchor when no id is present", () => {
    const md = `## No Id {last_verified="2026-04-01"}\n\nContent.\n`;
    const stamps = parseSectionStamps(md);
    expect(stamps).toHaveLength(1);
    expect(stamps[0]?.anchor).toBe("No Id");
    expect(stamps[0]?.lastVerifiedISO).toBe("2026-04-01");
  });

  it("mixes stamped and unstamped headings — returns only stamped ones", () => {
    const md = [
      `## Stamped {#s last_verified="2026-04-10"}`,
      `Content.`,
      `## Unstamped`,
      `Content.`,
    ].join("\n");
    const stamps = parseSectionStamps(md);
    expect(stamps).toHaveLength(1);
    expect(stamps[0]?.anchor).toBe("s");
  });

  it("returns [] for an empty body", () => {
    expect(parseSectionStamps("")).toHaveLength(0);
  });

  it("returns [] for a body with no headings", () => {
    expect(parseSectionStamps("Just a paragraph.")).toHaveLength(0);
  });
});
