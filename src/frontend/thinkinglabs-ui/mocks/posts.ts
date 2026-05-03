import type { PostDetail, PostSummary } from "../types";

const POSTS: PostSummary[] = [
  {
    slug: "verifier-asymmetry",
    title: "The verifier's asymmetry",
    deck: "On why the most useful person in an agentic system is the one who can say no, that's wrong faster than the model can say it again.",
    date: "2026-04-30",
    minutes: 14,
    words: 3420,
    topic: "Agents",
    featured: true,
  },
  {
    slug: "markdown-as-truth",
    title: "Markdown as the truth, everything else as a derivation",
    deck: "Why the boring file format keeps winning, and what you give up when you forget that.",
    date: "2026-03-12",
    minutes: 9,
    words: 2180,
    topic: "Systems",
  },
  {
    slug: "small-consultancies",
    title: "Notes on running a one-person consultancy in 2026",
    deck: "Three engagements a year, a reading habit, and the discipline of saying no to the rest.",
    date: "2026-02-04",
    minutes: 11,
    words: 2640,
    topic: "Work",
  },
  {
    slug: "calibration-as-practice",
    title: "Calibration as a practice, not a benchmark",
    deck: "Brier scores are a tool. The real instrument is the daily habit of writing down how sure you are.",
    date: "2025-12-18",
    minutes: 8,
    words: 1980,
    topic: "Epistemics",
  },
  {
    slug: "ai-and-craftsmanship",
    title: "AI and craftsmanship",
    deck: "What changes about doing good work when work is partially automated, and what stubbornly does not.",
    date: "2025-10-22",
    minutes: 12,
    words: 2820,
    topic: "Work",
  },
  {
    slug: "second-brain-mistake",
    title: "The second brain mistake",
    deck: "Note-taking systems built on the wrong metaphor about the first one.",
    date: "2025-09-08",
    minutes: 7,
    words: 1640,
    topic: "Systems",
  },
];

const POST_DETAIL: PostDetail = {
  slug: "verifier-asymmetry",
  title: "The verifier's asymmetry",
  deck: "On why the most useful person in an agentic system is the one who can say no, that's wrong faster than the model can say it again.",
  epigraph: {
    text: "The most precious commodity I know of is the new information.",
    by: "Charlie Munger",
  },
  date: "2026-04-30",
  updated: "2026-05-02",
  minutes: 14,
  words: 3420,
  topic: "Agents",
  license: "CC BY 4.0",
  citation: "Tom Wild, The verifier's asymmetry, thinkinglabs, 30 Apr 2026.",
  backlinks: 9,
  related: [
    {
      kind: "claim",
      title: "Frontier evals overstate coding ability outside greenfield repos",
      conf: 0.62,
    },
    { kind: "thought", title: "Why I keep a manual review step in agentic pipelines" },
    {
      kind: "prediction",
      title:
        "Apple ships an on-device assistant that beats Siri 2024 on intent F1 by 2x at WWDC 2026",
      conf: 0.55,
    },
    { kind: "input", title: "Engelbart, Augmenting Human Intellect (1962)" },
  ],
  sections: [
    {
      number: "01",
      title: "The asymmetry",
      blocks: [
        {
          type: "p",
          drop: true,
          text: "There is a particular kind of mistake that only confident systems make. The system finishes the work and only on inspection does the wrongness reveal itself.",
        },
        {
          type: "p",
          text: "Better evaluations and self-checks help, at the margin. They do not remove the separate labor of verification.",
        },
        {
          type: "pull",
          text: "The verifier's job has to be cheaper than the agent's job, by a real margin. If review takes as long as writing it, you've gained nothing.",
        },
      ],
    },
    {
      number: "02",
      title: "Why the bottleneck is upstream",
      blocks: [
        {
          type: "p",
          text: "Treating the reviewer as a bottleneck to eliminate is backwards. The verifier is the layer that distinguishes useful output from confident-looking noise.",
        },
        {
          type: "fig",
          caption:
            "Throughput against trust, for three configurations of an agentic pipeline. Pure-autonomous produced more output and less keepable work.",
          source: "thinkinglabs internal logs · 2025–26",
        },
      ],
    },
    {
      number: "03",
      title: "What good verification interfaces look like",
      blocks: [
        {
          type: "list",
          items: [
            "Make wrongness visible without forcing a full rewrite.",
            "Capture why something is wrong, not just that it is.",
            "Stay fast enough for the output rate.",
            "Allow explicit uncertainty when a verifier cannot judge.",
          ],
        },
      ],
    },
  ],
  footnotes: [
    {
      id: "fn1",
      text: "My first six months of building agentic pipelines optimised for fewer review steps. The hidden cost was poor keep-rate.",
    },
    {
      id: "fn2",
      text: "I would currently put at 0.45 the claim that the next widely-discussed AI product category will be verification tooling rather than autonomy.",
    },
  ],
};

export { POST_DETAIL, POSTS };
