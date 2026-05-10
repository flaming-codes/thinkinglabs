import type {
  ChangedMyMindDetail,
  DecisionDetail,
  DetailRelation,
  ProjectDetail,
  QuestionDetail,
} from "../../src/frontend/thinkinglabs-ui/types";
import { htmlSlot } from "./story-helpers";

interface PredictionDetailFixture {
  slug: string;
  prediction: string;
  confidence: number;
  made: string;
  resolves: string;
  resolvedOn: string | null;
  resolution: "pending" | "true" | "false" | "ambiguous";
  resolutionNote: string | null;
  daysUntil: number | null;
  daysSinceMade: number | null;
  topic: string;
  tags: readonly string[];
  evidence: readonly {
    label: string;
    href?: string;
  }[];
}

const relation = (kind: string, title: string, value?: string, href?: string): DetailRelation => ({
  kind,
  title,
  ...(value ? { value } : {}),
  ...(href ? { href } : {}),
});

const detailBody = (...paragraphs: string[]) =>
  htmlSlot(paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join(""));

const PROJECT_DETAIL: ProjectDetail = {
  slug: "thinkinglabs",
  title: "thinkinglabs",
  status: "alive",
  started: "2025-04-12",
  lastTouched: "2026-05-02",
  currentQuestion:
    "Can a markdown-canonical knowledge graph stay coherent under daily agent activity without review burnout?",
  helpWelcome:
    "Examples of verifier-first workflows, especially where agents propose edits and humans keep the source of truth clean.",
  tags: ["agents", "knowledge-graph", "astro"],
  links: [
    relation("repo", "Implementation notes", undefined, "/projects/thinkinglabs"),
    relation("feed", "Brain diff", undefined, "/brain-diff"),
  ],
  relatedThoughts: [
    relation("thought", "Cheap to verify, expensive to corrupt", "draft"),
    relation("thought", "Why I keep a manual review step", "1840w"),
  ],
  relatedClaims: [
    relation("claim", "Markdown + git is the right canonical store", "91%"),
    relation("claim", "Unattended agents should propose, never write", "82%"),
  ],
};

const PREDICTION_DETAIL: PredictionDetailFixture = {
  slug: "claude-multi-agent",
  prediction: "Claude ships native multi-agent orchestration as a first-class API surface in 2026.",
  confidence: 0.78,
  made: "2026-02-08",
  resolves: "2026-12-31",
  resolvedOn: null,
  resolution: "pending",
  resolutionNote: null,
  daysUntil: 242,
  daysSinceMade: 86,
  topic: "AI",
  tags: ["agents", "platforms", "apis"],
  evidence: [
    { label: "Agents SDK adoption moved from demos to production scaffolds." },
    { label: "Tool orchestration has become a platform-level differentiator." },
  ],
};

const CHANGED_MY_MIND_DETAIL: ChangedMyMindDetail = {
  slug: "rag-as-default",
  title: "I no longer think RAG is the right default for most assistants.",
  date: "2026-04-22",
  usedToBelieve:
    "Most assistant projects should start with a vector store and retrieval pipeline before adding more structure.",
  whatChanged:
    "A production debugging pass showed the retrieval layer returning the right answer with the wrong citation.",
  nowBelieve:
    "Structured source views and explicit context budgets beat a default vector store for small, trusted corpora.",
  supersededClaims: [
    relation("claim", "RAG over a vector store is the right default for most assistants", "31%"),
    relation("decision", "Use vector search as the initial retrieval primitive", "reversed"),
  ],
  tags: ["AI", "retrieval", "agents"],
};

const DECISION_DETAIL: DecisionDetail = {
  slug: "markdown-canonical-store",
  title: "Keep markdown as the canonical store; treat SQLite as a derived index.",
  status: "standing",
  date: "2026-04-22",
  chosen: "Markdown files remain canonical. SQLite is rebuilt from source.",
  why: "Git diffs, review, and rollback matter more than database ergonomics for personal knowledge.",
  context:
    "The SQLite-first experiment made querying pleasant but made review and source history too opaque.",
  options: [
    "Keep SQLite as canonical and add textual export snapshots.",
    "Move to a hosted CMS with richer editing affordances.",
    "Return to markdown source files and rebuild all query surfaces deterministically.",
  ],
  changeTrigger:
    "A future source format would need readable diffs, schema validation, and deterministic export without custom tooling.",
  followUp: "2026-10-22",
  reverses: [relation("decision", "Use SQLite as the canonical store", "2025-09-18")],
  reversedBy: [],
  relatedClaims: [
    relation("claim", "Markdown + git is the right canonical store for personal knowledge", "91%"),
    relation("claim", "Unattended agents should propose, never write", "82%"),
  ],
  relatedProjects: [relation("project", "thinkinglabs", "alive")],
  tags: ["architecture", "source-of-truth", "agents"],
};

const QUESTION_DETAIL: QuestionDetail = {
  slug: "verifier-ux",
  question: "What does a verifier-first UI actually look like, in shipped product form?",
  status: "open",
  asked: "2026-02-08",
  context:
    "Diff views and code review tools get close, but most user-facing products still optimize for generation over verification.",
  idealResponder:
    "Someone who has shipped a workflow where the user mostly checks agent work instead of authoring from scratch.",
  attempts: [
    "Mapped code review primitives onto writing and content curation workflows.",
    "Sketched a confidence-first feed for queued agent proposals.",
    "Compared side-by-side diffs against source-linked explanation panels.",
  ],
  relatedClaims: [
    relation("claim", "Cheap to verify, expensive to corrupt is the right design property", "81%"),
  ],
  relatedProjects: [
    relation("project", "thinkinglabs", "alive"),
    relation("project", "Calibration instrument", "shipping v1"),
  ],
  tags: ["UX", "agents", "verification"],
  responseAction: "/api/questions/verifier-ux/respond",
};

const PROJECT_DETAIL_SLOT = detailBody(
  "The project is intentionally boring at the storage layer: typed markdown files, deterministic derived artifacts, and reviewable diffs.",
  "The interesting part is the operating model. Agents can suggest changes every day, but the source tree only changes through explicit review.",
);

const PREDICTION_DETAIL_SLOT = detailBody(
  "This prediction is about product surface, not model capability. Multi-agent demos already exist; the forecast asks whether orchestration becomes a named, supported API primitive.",
  "I would count hosted coordination, typed handoffs, and observable sub-agent traces as strong evidence. A cookbook-only pattern would not resolve it.",
);

const CHANGED_MY_MIND_DETAIL_SLOT = detailBody(
  "The old view was reasonable when the problem looked like semantic search over loose documents. It became weaker once the corpus had schemas, stable IDs, and review requirements.",
  "The decisive failure mode was not retrieval quality in isolation. It was the confidence cost of checking whether the cited source actually supported the generated answer.",
);

const DECISION_DETAIL_SLOT = detailBody(
  "This decision deliberately keeps the comfortable query layer as a build artifact. The index can be thrown away and regenerated without losing any authorial intent.",
  "That constraint makes agent edits easier to audit: every durable change has a small textual diff and a schema-backed failure mode.",
);

const QUESTION_DETAIL_SLOT = detailBody(
  "The answer probably looks less like a chat transcript and more like a narrow reviewing instrument: source links, assertions, confidence, and a fast reject path.",
  "The open question is whether that can feel like a product for normal users rather than an internal tool for people who already enjoy diffs.",
);

export {
  CHANGED_MY_MIND_DETAIL,
  CHANGED_MY_MIND_DETAIL_SLOT,
  DECISION_DETAIL,
  DECISION_DETAIL_SLOT,
  PREDICTION_DETAIL,
  PREDICTION_DETAIL_SLOT,
  PROJECT_DETAIL,
  PROJECT_DETAIL_SLOT,
  QUESTION_DETAIL,
  QUESTION_DETAIL_SLOT,
};

export type { PredictionDetailFixture };
