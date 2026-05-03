import type { HomeDiff, HomeFeaturedClaim, KindSummary } from "../types";

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

const RECENT_DIFFS: HomeDiff[] = [
  {
    kind: "claim",
    action: "revised",
    title: "Frontier evals overstate coding ability outside greenfield repos",
    when: "2 days ago",
    confidence: 0.62,
    prev: 0.74,
  },
  {
    kind: "prediction",
    action: "resolved",
    title: "An open-weight model will match GPT-4o on MMLU by EOY 2025",
    when: "5 days ago",
    outcome: "true",
    stated: 0.7,
  },
  {
    kind: "decision",
    action: "reversed",
    title: "Use SQLite as the canonical store",
    when: "1 week ago",
    note: "Markdown → SQLite is now derive-only",
  },
  {
    kind: "thought",
    action: "added",
    title: "Why I keep writing in plain text after fifteen years",
    when: "1 week ago",
  },
  {
    kind: "claim",
    action: "deprecated",
    title: "RAG over a vector store is the right default",
    when: "2 weeks ago",
    confidence: 0.31,
    prev: 0.66,
  },
];

const FEATURED_CLAIM: HomeFeaturedClaim = {
  id: "claims/proposal-confirmation-pattern",
  title: "Unattended agents should propose, never write.",
  body: "Five background agents scan the repo daily; none touch content/. They enqueue typed proposals and a human drains the queue. The extra step is cheap. Quiet hallucinations becoming canon are not.",
  confidence: 0.82,
  reviewed: "2026-04-19",
  evidence: 4,
  opposing: 1,
};

export { FEATURED_CLAIM, KINDS, RECENT_DIFFS };
