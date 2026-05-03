import type { AboutKind, ThoughtDetail, ThoughtSummary } from "../types";

const THOUGHTS: ThoughtSummary[] = [
  {
    slug: "manual-review-step",
    title: "Why I keep a manual review step in agentic pipelines",
    excerpt:
      "The cost of a wrong autonomous action is rarely linear in the size of the action. A junior engineer with rm -rf access is more dangerous than the same engineer writing emails.",
    words: 1840,
    minutes: 9,
    state: "drafting",
    touched: "2026-05-02",
    backlinks: 7,
  },
  {
    slug: "1962-still-right",
    title: "What 1962 still gets right about agents",
    excerpt:
      "Engelbart's framing of augmentation is structural, not technical: it's about the loops a human is allowed to close, not the size of the model that closes them.",
    words: 920,
    minutes: 5,
    state: "settled",
    touched: "2026-04-19",
    backlinks: 4,
  },
  {
    slug: "calibration-habit",
    title: "Calibration as a small daily violence to the ego",
    excerpt:
      "You write down what you think will happen, write down how sure you are, and later the world tells you who you actually were.",
    words: 1260,
    minutes: 6,
    state: "settled",
    touched: "2026-03-30",
    backlinks: 11,
  },
  {
    slug: "markdown-canonical",
    title: "On keeping markdown as the canonical store",
    excerpt:
      "Every system that started database-first and rendered markdown later has ended up renegotiating that decision under duress.",
    words: 740,
    minutes: 4,
    state: "settled",
    touched: "2026-03-02",
    backlinks: 6,
  },
  {
    slug: "second-brain-allergy",
    title: "Why I have an allergy to the phrase second brain",
    excerpt:
      "The metaphor is wrong on both sides — the system isn't a brain, and you don't have a first one to be supplemented.",
    words: 510,
    minutes: 3,
    state: "still-thinking",
    touched: "2026-04-11",
    backlinks: 2,
  },
  {
    slug: "boredom-is-data",
    title: "Boredom as a signal you're past the interesting part",
    excerpt:
      "Most of my best decisions to drop a project came from a quiet feeling that the next month would teach me less than the last one had.",
    words: 1090,
    minutes: 5,
    state: "settled",
    touched: "2026-01-04",
    backlinks: 5,
  },
  {
    slug: "verifiable-edits",
    title: "Cheap to verify, expensive to corrupt",
    excerpt:
      "A useful design heuristic for agentic systems: optimize the asymmetry between checking the work and breaking it.",
    words: 670,
    minutes: 3,
    state: "still-thinking",
    touched: "2026-05-01",
    backlinks: 1,
  },
];

const THOUGHT_DETAIL: ThoughtDetail = {
  title: "Why I keep a manual review step in agentic pipelines",
  slug: "manual-review-step",
  state: "drafting",
  started: "2026-04-22",
  touched: "2026-05-02",
  words: 1840,
  minutes: 9,
  paragraphs: [
    "The cost of a wrong autonomous action is rarely linear in the size of the action. The blast radius of a single confident mistake determines whether a system can be safely automated.",
    "I've been running variants of the same workflow for about eighteen months: an agent does the work, a human reviews it, and the review is logged as structured data.",
    "The instinct in this corner of the field is to treat the human as a bottleneck to be eliminated. I think that's the wrong frame.",
    "Two things make this work: the reviewer's job must stay cheaper than the agent's, and disagreement must be structured enough to improve the loop.",
  ],
  questions: [
    "Does this generalise past code? My instinct says yes for prose, no for trades.",
    "What's the right shape of a reviewer's interface as a primitive?",
  ],
  related: [
    {
      kind: "claim",
      title: "Frontier evals overstate coding ability outside greenfield repos",
      conf: 0.62,
    },
    { kind: "thought", title: "Cheap to verify, expensive to corrupt" },
    { kind: "input", title: "Engelbart, Augmenting Human Intellect (1962, re-read)" },
  ],
  history: [
    { date: "2026-05-02", note: "tightened opening, cut tooling specifics" },
    { date: "2026-04-30", note: "added verifier asymmetry framing" },
    { date: "2026-04-26", note: "started section on review-as-structured-data" },
    { date: "2026-04-22", note: "began" },
  ],
};

const ABOUT_KINDS: AboutKind[] = [
  { name: "Thoughts", gloss: "Short-form essays. Some settled, many still moving.", count: 48 },
  {
    name: "Claims",
    gloss: "Things I believe, with a confidence number and the evidence I'd point to.",
    count: 132,
  },
  {
    name: "Predictions",
    gloss: "Falsifiable forecasts with a stated probability and a resolution date.",
    count: 38,
  },
  {
    name: "Decisions",
    gloss: "Choices made and reasoning kept honest by being read later.",
    count: 21,
  },
  {
    name: "Changed my mind",
    gloss: "Where a claim or decision flipped, and what caused it.",
    count: 14,
  },
  { name: "Questions", gloss: "Open ones. Tracked rather than answered.", count: 27 },
  {
    name: "Posts",
    gloss: "Long-form pieces polished enough to publish under their own URL.",
    count: 19,
  },
  {
    name: "Projects",
    gloss: "Active threads — what I'm currently spending attention on.",
    count: 4,
  },
  {
    name: "Inputs",
    gloss: "Books, papers, talks. References the rest of the system points at.",
    count: 86,
  },
];

export { ABOUT_KINDS, THOUGHT_DETAIL, THOUGHTS };
