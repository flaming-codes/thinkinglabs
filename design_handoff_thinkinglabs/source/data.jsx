// Shared sample data for all three variations.
// Mirrors the kind taxonomy from the real repo (src/lib/surfaces.ts) — claims,
// thoughts, inputs, projects, predictions, changed-my-mind, decisions,
// questions, posts. Counts and items are illustrative.

const KINDS = [
  {
    slug: "claims",
    title: "Claims",
    desc: "Atomic structured assertions, with confidence and evidence.",
    count: 47,
    accent: "Confidence in [0,1]",
  },
  {
    slug: "thoughts",
    title: "Thoughts",
    desc: "Rough-draft prose; the soil claims are derived from.",
    count: 132,
    accent: "Pre-structured",
  },
  {
    slug: "inputs",
    title: "Inputs",
    desc: "Things I read, watched, or argued with that changed something.",
    count: 89,
    accent: "External",
  },
  {
    slug: "projects",
    title: "Projects",
    desc: "Active, dormant, shipped. Each carries a current question.",
    count: 14,
    accent: "Alive: 4",
  },
  {
    slug: "predictions",
    title: "Predictions",
    desc: "Dated forecasts with a stated confidence. Scored later.",
    count: 38,
    accent: "Brier 0.18",
  },
  {
    slug: "changed-my-mind",
    title: "Changed my mind",
    desc: "Public reversals — what I used to believe and why I don't.",
    count: 11,
    accent: "Receipts",
  },
  {
    slug: "decisions",
    title: "Decisions",
    desc: "Choices made, with the context that made them legible.",
    count: 26,
    accent: "Reversible?",
  },
  {
    slug: "questions",
    title: "Questions",
    desc: "Open threads I haven't earned an answer to yet.",
    count: 41,
    accent: "Standing",
  },
  {
    slug: "posts",
    title: "Posts",
    desc: "Long-form writing intended to be read straight through.",
    count: 18,
    accent: "Essays",
  },
];

const RECENT_DIFFS = [
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

const FEATURED_CLAIM = {
  id: "claims/proposal-confirmation-pattern",
  title: "Unattended agents should propose, never write.",
  body: "Five background agents scan the repo daily; none of them touch content/. They enqueue typed proposals into a local queue, and a human drains it. The cost of the extra step is small; the cost of a quiet hallucination becoming canon is not.",
  confidence: 0.82,
  reviewed: "2026-04-19",
  evidence: 4,
  opposing: 1,
};

window.TL_DATA = { KINDS, RECENT_DIFFS, FEATURED_CLAIM };
