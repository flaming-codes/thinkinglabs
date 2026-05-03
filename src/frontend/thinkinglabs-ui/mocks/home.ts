import type { KindSummary } from "../types";

const KINDS: KindSummary[] = [
  {
    slug: "claims",
    title: "Claims",
    description: "Atomic structured assertions, with confidence and evidence.",
    count: 47,
    accent: "Confidence in [0,1]",
  },
  {
    slug: "thoughts",
    title: "Thoughts",
    description: "Rough-draft prose; the soil claims are derived from.",
    count: 132,
    accent: "Pre-structured",
  },
  {
    slug: "inputs",
    title: "Inputs",
    description: "Things I read, watched, or argued with that changed something.",
    count: 89,
    accent: "External",
  },
  {
    slug: "projects",
    title: "Projects",
    description: "Active, dormant, shipped. Each carries a current question.",
    count: 14,
    accent: "Alive: 4",
  },
  {
    slug: "predictions",
    title: "Predictions",
    description: "Dated forecasts with a stated confidence. Scored later.",
    count: 38,
    accent: "Brier 0.18",
  },
  {
    slug: "changed-my-mind",
    title: "Changed my mind",
    description: "Public reversals — what I used to believe and why I don't.",
    count: 11,
    accent: "Receipts",
  },
  {
    slug: "decisions",
    title: "Decisions",
    description: "Choices made, with the context that made them legible.",
    count: 26,
    accent: "Reversible?",
  },
  {
    slug: "questions",
    title: "Questions",
    description: "Open threads I haven't earned an answer to yet.",
    count: 41,
    accent: "Standing",
  },
  {
    slug: "posts",
    title: "Posts",
    description: "Long-form writing intended to be read straight through.",
    count: 18,
    accent: "Essays",
  },
];

export { KINDS };
