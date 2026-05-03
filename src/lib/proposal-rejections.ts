import { join, resolve } from "node:path";
import { readJsonState, writeJsonState } from "./json-state.ts";
import type { ProposalSource } from "./proposal-queue.ts";

/** Canonical path for one agent's persisted rejection memory. */
export function proposalRejectionsPath(cwd: string, source: ProposalSource): string {
  return join(resolve(cwd), `.${source}-rejections.json`);
}

/** Read one agent's rejection memory, defaulting to an empty list. */
export function readProposalRejections<T>(cwd: string, source: ProposalSource): T[] {
  return readJsonState<T[]>(proposalRejectionsPath(cwd, source), []);
}

/** Persist one agent's rejection memory. */
export function writeProposalRejections<T>(
  cwd: string,
  source: ProposalSource,
  entries: ReadonlyArray<T>,
): void {
  writeJsonState(proposalRejectionsPath(cwd, source), [...entries]);
}

/** Replace any matching entry, then append the current rejection snapshot. */
export function upsertProposalRejection<T>(
  cwd: string,
  source: ProposalSource,
  next: T,
  same: (entry: T) => boolean,
): void {
  const entries = readProposalRejections<T>(cwd, source).filter((entry) => !same(entry));
  writeProposalRejections(cwd, source, [...entries, next]);
}

/** Append the rejection only when it is not already present. */
export function appendUniqueProposalRejection<T>(
  cwd: string,
  source: ProposalSource,
  next: T,
  same: (entry: T) => boolean,
): void {
  const entries = readProposalRejections<T>(cwd, source);
  if (entries.some((entry) => same(entry))) return;
  writeProposalRejections(cwd, source, [...entries, next]);
}
