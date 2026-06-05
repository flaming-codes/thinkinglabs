import { describe, expect, it } from "vite-plus/test";
import { buildLabel, groupFeedEntriesByDay } from "../src/lib/brain-diff-view.ts";
import type { EntryType, FeedEntry } from "../src/lib/brain-diff.ts";

function entry(overrides: Partial<FeedEntry> & Pick<FeedEntry, "isoDate">): FeedEntry {
  return {
    sha: "deadbeef",
    path: "content/claims/example.md",
    type: "new-claim" as EntryType,
    title: "Example",
    score: null,
    summary: null,
    ...overrides,
  };
}

describe("groupFeedEntriesByDay", () => {
  it("groups by UTC day, newest day first", () => {
    const now = "2026-06-04T12:00:00.000Z";
    const days = groupFeedEntriesByDay(
      [
        entry({ isoDate: "2026-05-20T09:00:00Z" }),
        entry({ isoDate: "2026-06-04T09:00:00Z" }),
        entry({ isoDate: "2025-12-01T09:00:00Z" }),
        entry({ isoDate: "2026-06-03T09:00:00Z" }),
      ],
      now,
    );
    expect(days.map((d) => d.day)).toEqual(["Today", "Yesterday", "May 20", "Dec 1, 2025"]);
  });

  it("normalizes the day bucket to UTC so it matches the UTC build clock", () => {
    // 00:30 at +02:00 is 22:30 UTC the previous calendar day; it must bucket under the UTC day.
    const now = "2026-06-03T12:00:00.000Z";
    const days = groupFeedEntriesByDay([entry({ isoDate: "2026-06-04T00:30:00+02:00" })], now);
    expect(days).toHaveLength(1);
    expect(days[0]?.day).toBe("Today");
  });

  it("keeps multiple entries within the same day together", () => {
    const now = "2026-06-04T12:00:00.000Z";
    const days = groupFeedEntriesByDay(
      [
        entry({ isoDate: "2026-06-01T08:00:00Z", title: "First" }),
        entry({ isoDate: "2026-06-01T20:00:00Z", title: "Second" }),
      ],
      now,
    );
    expect(days).toHaveLength(1);
    expect(days[0]?.entries.map((e) => e.title)).toEqual(["First", "Second"]);
  });

  it("maps kind, action verb, and why from the feed entry", () => {
    const now = "2026-06-04T12:00:00.000Z";
    const [day] = groupFeedEntriesByDay(
      [
        entry({
          isoDate: "2026-06-04T09:00:00Z",
          path: "content/claims/x.md",
          type: "claim-revised" as EntryType,
          summary: "tightened the bound",
        }),
        entry({ isoDate: "2026-06-04T08:00:00Z", summary: null }),
      ],
      now,
    );
    const first = day?.entries[0];
    expect(first?.kind).toBe("claim");
    expect(first?.action).toBe("revised");
    expect(first?.why).toBe("tightened the bound");
    expect(day?.entries[1]?.why).toBeUndefined();
  });

  it("returns an empty array for no entries", () => {
    expect(groupFeedEntriesByDay([], "2026-06-04T12:00:00.000Z")).toEqual([]);
  });
});

describe("buildLabel", () => {
  it("formats a generated ISO timestamp as YYYY-MM-DD HH:MM UTC", () => {
    expect(buildLabel("2026-05-14T11:48:32.000Z")).toBe("2026-05-14 11:48 UTC");
  });

  it("returns null when the timestamp is absent or unparseable", () => {
    expect(buildLabel(undefined)).toBeNull();
    expect(buildLabel("not-a-date")).toBeNull();
  });
});
