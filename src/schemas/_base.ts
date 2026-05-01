import { z } from "zod";

/** Reused string-array shape used wherever frontmatter lists tags or link refs; tightening here propagates everywhere. */
export const linkArray = z.array(z.string().min(1));

/** Tags carry no semantics beyond grouping; declared once so every kind picks up identical validation. */
export const tagsField = linkArray.default([]);

/** Accepts a YAML-parsed Date or an ISO-8601 string at the edge; normalized to ISO string so downstream code never re-parses. */
export const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString() : v),
  z.iso.date().or(z.iso.datetime({ offset: true })),
);
