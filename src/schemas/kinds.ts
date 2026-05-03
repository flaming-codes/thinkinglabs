/** Single source of truth for the set of object kinds the system understands. */
export const KINDS = [
  "thoughts",
  "claims",
  "projects",
  "predictions",
  "changed-my-mind",
  "decisions",
  "questions",
  "posts",
  "inputs",
  "provenance",
] as const;

/** Literal union of every kind directory under content/. */
export type Kind = (typeof KINDS)[number];
