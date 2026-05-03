type ThemeKey = "forum" | "sans-stark" | "bone-accent";

interface ThemeTokens {
  bg: string;
  ink: string;
  muted: string;
  soft: string;
  line: string;
  footBg: string;
  footInk: string;
  footMuted: string;
  accent: string | null;
  displayFamily: string;
  displayWeight: number;
  displayLetter: string;
  bodyFamily: string;
  rowTitleSize: number;
  ledeSize: number;
  ledeLetter: string;
  label: string;
}

interface KindSummary {
  slug: string;
  title: string;
  description: string;
  count: number;
  accent: string;
}

interface HomeDiff {
  kind: string;
  action: string;
  title: string;
  when: string;
  confidence?: number;
  prev?: number;
  outcome?: string;
  stated?: number;
  note?: string;
}

interface HomeFeaturedClaim {
  id: string;
  title: string;
  body: string;
  confidence: number;
  reviewed: string;
  evidence: number;
  opposing: number;
}

interface ClaimSummary {
  id: string;
  title: string;
  conf: number;
  prev: number | null;
  status: "active" | "deprecated" | "superseded";
  reviewed: string;
  evidence: number;
  opposing: number;
  tags: string[];
}

interface ClaimEvidence {
  kind: string;
  title: string;
  id: string;
}

interface ClaimHistory {
  date: string;
  conf: number;
  note: string;
}

interface ClaimDetail {
  id: string;
  title: string;
  conf: number;
  reviewed: string;
  status: "active" | "deprecated" | "superseded";
  tags: string[];
  body: string[];
  evidence: ClaimEvidence[];
  opposing: ClaimEvidence[];
  history: ClaimHistory[];
}

interface ThoughtSummary {
  slug: string;
  title: string;
  excerpt: string;
  words: number;
  minutes: number;
  state: "drafting" | "settled" | "still-thinking";
  touched: string;
  backlinks: number;
}

interface ThoughtRelated {
  kind: string;
  title: string;
  conf?: number;
}

interface ThoughtHistory {
  date: string;
  note: string;
}

interface ThoughtDetail {
  title: string;
  slug: string;
  state: "drafting" | "settled" | "still-thinking";
  started: string;
  touched: string;
  words: number;
  minutes: number;
  paragraphs: string[];
  questions: string[];
  related: ThoughtRelated[];
  history: ThoughtHistory[];
}

interface AboutKind {
  name: string;
  gloss: string;
  count: number;
}

interface PostSummary {
  slug: string;
  title: string;
  deck: string;
  date: string;
  minutes: number;
  words: number;
  topic: string;
  featured?: boolean;
}

interface PostRelated {
  kind: string;
  title: string;
  conf?: number;
}

type PostBlock =
  | { type: "p"; text: string; drop?: boolean }
  | { type: "pull"; text: string; attrib?: string | null }
  | { type: "fig"; caption: string; source: string }
  | { type: "list"; items: string[] };

interface PostSection {
  number: string;
  title: string;
  blocks: PostBlock[];
}

interface PostFootnote {
  id: string;
  text: string;
}

interface PostDetail {
  slug: string;
  title: string;
  deck: string;
  epigraph: { text: string; by: string };
  date: string;
  updated: string;
  minutes: number;
  words: number;
  topic: string;
  license: string;
  citation: string;
  backlinks: number;
  related: PostRelated[];
  sections: PostSection[];
  footnotes: PostFootnote[];
}

interface ActiveThread {
  title: string;
  kind: string;
  currentQ: string;
  since: string;
  pulse: number;
}

interface NowData {
  season: string;
  thesis: string;
  active: ActiveThread[];
  reading: string[];
  notReading: string[];
}

interface CalibrationBin {
  stated: number;
  n: number;
  hit: number | null;
}

interface PredictionSnapshot {
  title: string;
  stated: number;
  outcome: boolean | null;
  resolved?: string;
  due?: string;
}

interface CalibrationData {
  brier: number;
  log: number;
  count: number;
  resolved: number;
  pending: number;
  bins: CalibrationBin[];
  recent: PredictionSnapshot[];
}

interface DiffEntry {
  kind: string;
  action: string;
  title: string;
  from?: number;
  to?: number;
  conf?: number;
  words?: number;
  outcome?: string;
  why?: string;
}

interface DiffDay {
  day: string;
  entries: DiffEntry[];
}

export type {
  AboutKind,
  ActiveThread,
  CalibrationBin,
  CalibrationData,
  ClaimDetail,
  ClaimEvidence,
  ClaimHistory,
  ClaimSummary,
  DiffDay,
  DiffEntry,
  HomeDiff,
  HomeFeaturedClaim,
  KindSummary,
  NowData,
  PostBlock,
  PostDetail,
  PostFootnote,
  PostRelated,
  PostSection,
  PostSummary,
  PredictionSnapshot,
  ThemeKey,
  ThemeTokens,
  ThoughtDetail,
  ThoughtHistory,
  ThoughtRelated,
  ThoughtSummary,
};
