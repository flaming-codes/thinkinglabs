interface KindSummary {
  slug: string;
  title: string;
  description: string;
  count: number;
  accent: string;
  href?: string;
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
  href?: string;
}

interface ClaimEvidence {
  kind: string;
  title: string;
  id: string;
  href?: string;
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
  href?: string;
}

interface ThoughtRelated {
  kind: string;
  title: string;
  conf?: number;
  href?: string;
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
  href?: string;
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
  href?: string;
}

interface PostRelated {
  kind: string;
  title: string;
  conf?: number;
  href?: string;
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
  href?: string;
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
  href?: string;
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

interface IndexStat {
  label: string;
  value: string;
  sub: string;
}

interface EntityIndexRow {
  kicker: string;
  title: string;
  href?: string | undefined;
  summary?: string | undefined;
  meta?: string[] | undefined;
  value?: string | undefined;
  valueLabel?: string | undefined;
}

interface EntityIndexSection {
  label: string;
  title: string;
  rows: EntityIndexRow[];
}

interface EntityIndexPage {
  slug: string;
  eyebrow: string;
  title: string;
  deck: string;
  count: string;
  stats: IndexStat[];
  sections: EntityIndexSection[];
  footer?: string | undefined;
}

interface ProjectRow {
  slug: string;
  title: string;
  deck: string;
  state: string;
  stateFilled: boolean;
  started: string;
  last: string;
  stack: string;
  why: string;
  next: string;
  href?: string;
}

interface ProjectsView {
  total: number;
  active: number;
  stats: IndexStat[];
  rows: ProjectRow[];
}

interface PredictionRow {
  slug: string;
  title: string;
  conf: number;
  due: string;
  days: number;
  state: "open" | "resolved";
  topic: string;
  outcome?: "true" | "false";
  resolvedDate?: string;
  href?: string;
}

interface PredictionsView {
  open: PredictionRow[];
  resolved: PredictionRow[];
  stats: IndexStat[];
}

interface FlipSummary {
  slug: string;
  title: string;
  flippedOn: string;
  held: string;
  confThen: number;
  confNow: number;
  tipper: string;
  topic: string;
  href?: string;
}

interface ChangedMyMindView {
  total: number;
  stats: IndexStat[];
  flips: FlipSummary[];
}

interface DecisionRow {
  slug: string;
  title: string;
  date: string;
  state: "active" | "reversed" | "archived";
  summary: string;
  review: string | null;
  reversedBy?: string;
  href?: string;
}

interface DecisionsView {
  total: number;
  active: DecisionRow[];
  reversed: DecisionRow[];
  archived: DecisionRow[];
  stats: IndexStat[];
}

interface QuestionRow {
  slug: string;
  title: string;
  asked: string;
  heat: number;
  deck: string;
  wouldResolve: string;
  topic: string;
  related: string[];
  href?: string;
}

interface QuestionsView {
  total: number;
  stats: IndexStat[];
  questions: QuestionRow[];
}

interface InputRow {
  slug: string;
  title: string;
  by: string;
  kind: string;
  year: string;
  date: string;
  influence: number;
  note: string;
  href?: string;
}

interface InputsView {
  total: number;
  stats: IndexStat[];
  inputs: InputRow[];
}

interface InputCitation {
  kind: string;
  title: string;
  conf?: number;
  date?: string;
  href?: string;
}

interface InputMarginNote {
  page: string;
  text: string;
}

interface InputDetail {
  slug: string;
  title: string;
  by: string;
  kind: string;
  year: string;
  publisher: string;
  read: string;
  reread: string[];
  takeaway: string;
  oneLine: string;
  citations: InputCitation[];
  marginNotes: InputMarginNote[];
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
  ChangedMyMindView,
  ClaimDetail,
  ClaimEvidence,
  ClaimHistory,
  ClaimSummary,
  DecisionRow,
  DecisionsView,
  DiffDay,
  DiffEntry,
  EntityIndexPage,
  EntityIndexRow,
  EntityIndexSection,
  FlipSummary,
  IndexStat,
  InputCitation,
  InputDetail,
  InputMarginNote,
  InputRow,
  InputsView,
  KindSummary,
  NowData,
  PostBlock,
  PostDetail,
  PostFootnote,
  PostRelated,
  PostSection,
  PostSummary,
  PredictionRow,
  PredictionSnapshot,
  PredictionsView,
  ProjectRow,
  ProjectsView,
  QuestionRow,
  QuestionsView,
  ThoughtDetail,
  ThoughtHistory,
  ThoughtRelated,
  ThoughtSummary,
};
