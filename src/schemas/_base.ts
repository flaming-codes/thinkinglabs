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

/** Load-bearing probability in [0,1] shared by claims and predictions; declared once so the constraint and message never drift. */
export const confidenceField = z
  .number({ message: "confidence must be a number in [0,1]" })
  .min(0, { message: "confidence must be >= 0" })
  .max(1, { message: "confidence must be <= 1" });
