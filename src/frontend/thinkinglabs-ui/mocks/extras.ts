import type { CalibrationData, DiffDay, NowData } from "../types";

const NOW: NowData = {
  season: "May 2026 — late spring",
  thesis: "Trying to make agentic edits cheap to verify and expensive to corrupt.",
  active: [
    {
      title: "thinkinglabs",
      kind: "this site",
      currentQ:
        "Can a markdown-canonical knowledge graph stay coherent under daily agent activity for a year without review burnout?",
      since: "2024-11",
      pulse: 0.82,
    },
    {
      title: "Calibration as a habit",
      kind: "personal practice",
      currentQ: "What confidence floor makes me update versus quietly drifting?",
      since: "2025-08",
      pulse: 0.6,
    },
    {
      title: "wild.as",
      kind: "consultancy",
      currentQ: "What does the right shape of an AI and systems consultancy look like in 2026?",
      since: "2024-01",
      pulse: 0.74,
    },
    {
      title: "Personal MCP server",
      kind: "tool",
      currentQ: "Which resources are worth exposing as MCP vs plain JSON feeds?",
      since: "2026-02",
      pulse: 0.5,
    },
  ],
  reading: [
    "Engelbart, Augmenting Human Intellect (1962, re-read)",
    "Kahneman & Klein, Conditions for Intuitive Expertise",
    "Stafford Beer, Brain of the Firm",
    "Anthropic, Sleeper Agents (2024)",
  ],
  notReading: ["Anything pitched as a second brain", "Founder advice on Twitter"],
};

const CALIBRATION: CalibrationData = {
  brier: 0.18,
  log: -0.42,
  count: 38,
  resolved: 26,
  pending: 12,
  bins: [
    { stated: 0.1, n: 4, hit: 0.25 },
    { stated: 0.2, n: 3, hit: 0.33 },
    { stated: 0.3, n: 2, hit: 0.5 },
    { stated: 0.4, n: 0, hit: null },
    { stated: 0.5, n: 3, hit: 0.33 },
    { stated: 0.6, n: 5, hit: 0.6 },
    { stated: 0.7, n: 4, hit: 0.75 },
    { stated: 0.8, n: 3, hit: 0.66 },
    { stated: 0.9, n: 2, hit: 1 },
  ],
  recent: [
    {
      title: "An open-weight model will match GPT-4o on MMLU by EOY 2025",
      stated: 0.7,
      outcome: true,
      resolved: "2026-04-28",
    },
    {
      title: "I'll publish at least 8 long-form posts in 2026",
      stated: 0.45,
      outcome: null,
      due: "2026-12-31",
    },
    {
      title:
        "Apple ships an on-device assistant that beats Siri 2024 on intent F1 by 2x at WWDC 2026",
      stated: 0.55,
      outcome: null,
      due: "2026-06-15",
    },
    {
      title: "Vector DB sales cool measurably by 2026",
      stated: 0.6,
      outcome: true,
      resolved: "2026-03-10",
    },
    {
      title: "I'll keep weekly review streak through Q1",
      stated: 0.85,
      outcome: false,
      resolved: "2026-04-01",
    },
  ],
};

const BRAIN_DIFF: DiffDay[] = [
  {
    day: "Today",
    entries: [
      {
        kind: "claim",
        action: "revised",
        title: "Frontier evals overstate coding ability outside greenfield repos",
        from: 0.74,
        to: 0.62,
        why: "Three weeks of refactor work in a large TS codebase. Models still get lost in imports.",
      },
    ],
  },
  {
    day: "Yesterday",
    entries: [
      {
        kind: "thought",
        action: "added",
        title: "Why I keep a manual review step in agentic pipelines",
        words: 1840,
      },
      {
        kind: "prediction",
        action: "updated",
        title:
          "Apple ships an on-device assistant that beats Siri 2024 on intent F1 by 2x at WWDC 2026",
        from: 0.55,
        to: 0.55,
        why: "No movement, but bumped freshness.",
      },
    ],
  },
  {
    day: "Apr 28",
    entries: [
      {
        kind: "prediction",
        action: "resolved",
        title: "An open-weight model will match GPT-4o on MMLU by EOY 2025",
        from: 0.7,
        outcome: "true",
        why: "Llama 3.3 405B crossed 86 in March. Counts.",
      },
      {
        kind: "claim",
        action: "added",
        title: "Calibration is the only honest measure of an opinion economy",
        conf: 0.78,
      },
    ],
  },
  {
    day: "Apr 22",
    entries: [
      {
        kind: "decision",
        action: "reversed",
        title: "Use SQLite as the canonical store",
        why: "Markdown wins for git-trackability. SQLite is now derived only.",
      },
      {
        kind: "claim",
        action: "deprecated",
        title: "RAG over a vector store is the right default for most assistants",
        from: 0.66,
        to: 0.31,
      },
    ],
  },
];

export { BRAIN_DIFF, CALIBRATION, NOW };
