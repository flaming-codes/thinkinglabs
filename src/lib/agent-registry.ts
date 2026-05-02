/** Stable identifier for an agent that emits proposals; literal-union forces an explicit per-agent registration. */
export type ProposalSource =
  | "dormant-flip"
  | "review-decisions"
  | "resolve-predictions"
  | "freshness-review"
  | "triage-questions";

/** Mutation kind; closed union so the dispatcher can switch exhaustively when applying actions. */
export type ProposalType =
  | "project-flip-dormant"
  | "decision-followup-due"
  | "prediction-resolve"
  | "post-section-restamp"
  | "question-answer-curate";

/** Per-agent metadata; the single fact-source for the proposal-source enum, the review CLI, and dispatch wiring. */
export interface AgentSpec {
  readonly sourceId: ProposalSource;
  readonly proposalTypes: ReadonlyArray<ProposalType>;
  readonly handlerModule: string;
  readonly cliPath: string;
  readonly stateFiles: ReadonlyArray<string>;
  readonly schedule?: string;
  readonly usesLLM: boolean;
}

/** Registry of every background agent that emits proposals; ordering is the display order in CLIs. */
export const AGENT_REGISTRY = {
  "dormant-flip": {
    sourceId: "dormant-flip",
    proposalTypes: ["project-flip-dormant"],
    handlerModule: "../src/lib/agents/dormant-flip.ts",
    cliPath: "scripts/dormant-flip.ts",
    stateFiles: [".dormant-flip-rejections.json"],
    schedule: "daily 03:00",
    usesLLM: false,
  },
  "review-decisions": {
    sourceId: "review-decisions",
    proposalTypes: ["decision-followup-due"],
    handlerModule: "../src/lib/agents/review-decisions.ts",
    cliPath: "scripts/review-decisions.ts",
    stateFiles: [".review-decisions-rejections.json"],
    schedule: "daily 03:30",
    usesLLM: false,
  },
  "resolve-predictions": {
    sourceId: "resolve-predictions",
    proposalTypes: ["prediction-resolve"],
    handlerModule: "../src/lib/agents/resolve-predictions.ts",
    cliPath: "scripts/resolve-predictions.ts",
    stateFiles: [".resolve-predictions-rejections.json"],
    schedule: "daily 04:00",
    usesLLM: true,
  },
  "freshness-review": {
    sourceId: "freshness-review",
    proposalTypes: ["post-section-restamp"],
    handlerModule: "../src/lib/agents/freshness-review.ts",
    cliPath: "scripts/freshness-review.ts",
    stateFiles: [],
    schedule: "weekly Mon 04:30",
    usesLLM: true,
  },
  "triage-questions": {
    sourceId: "triage-questions",
    proposalTypes: ["question-answer-curate"],
    handlerModule: "../src/lib/agents/triage-questions.ts",
    cliPath: "scripts/triage-questions.ts",
    stateFiles: [".triage-questions-rejections.json"],
    schedule: "daily 05:00",
    usesLLM: true,
  },
} as const satisfies Record<ProposalSource, AgentSpec>;

/** Stable list of every proposal source id; derived from the registry. */
export const PROPOSAL_SOURCES = Object.keys(AGENT_REGISTRY) as ReadonlyArray<ProposalSource>;

/** Stable list of every proposal type emitted by any registered agent; derived from the registry. */
export const PROPOSAL_TYPES = Object.values(AGENT_REGISTRY).flatMap(
  (spec) => spec.proposalTypes,
) as ReadonlyArray<ProposalType>;

/** Process ids that may emit AI provenance events; includes proposal agents plus the human-driven `derive-claims` curation flow. */
export const PROVENANCE_PROCESS_IDS = [
  ...PROPOSAL_SOURCES,
  "derive-claims",
] as const satisfies ReadonlyArray<string>;

/** Inferred process-id type for provenance writers; superset of `ProposalSource`. */
export type ProvenanceProcessId = (typeof PROVENANCE_PROCESS_IDS)[number];
