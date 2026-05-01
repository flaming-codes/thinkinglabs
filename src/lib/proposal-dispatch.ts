import { z } from "zod";
import type { ProposalType, QueuedProposal } from "./proposal-queue.ts";

/** Handler for one ProposalType; the CLI dispatches based on `type`. */
export interface ProposalHandler<P> {
  readonly type: ProposalType;
  readonly payloadSchema: z.ZodType<P>;
  /** Build the typed payload from the queue entry; throws on invalid via the schema. */
  parse(proposal: QueuedProposal): P;
  /** Apply an "accept" action: mutate the source tree. Returns a one-line summary for the CLI. */
  apply(proposal: QueuedProposal & { payload: P }): Promise<string>;
  /** Apply an "edit" action: open the relevant file in $EDITOR; on save, validate and write. */
  edit(proposal: QueuedProposal & { payload: P }): Promise<string>;
  /** Optional reject hook: per-agent dedup so a rejected proposal isn't re-enqueued next run. */
  reject?(proposal: QueuedProposal & { payload: P }): Promise<void>;
}

/** Module-scope registry mapping ProposalType to its registered handler. */
const registry = new Map<ProposalType, ProposalHandler<unknown>>();

/** Registers a handler; idempotent on same-reference re-registration, throws on different-object re-registration. */
export function registerHandler<P>(handler: ProposalHandler<P>): void {
  const existing = registry.get(handler.type);
  if (!existing) {
    registry.set(handler.type, handler as ProposalHandler<unknown>);
    return;
  }
  if (existing === (handler as ProposalHandler<unknown>)) return;
  throw new Error(
    `proposal-dispatch: handler for type "${handler.type}" is already registered with a different implementation`,
  );
}

/** Look up a handler; throws when the type has no registered handler (mis-wired agent). */
export function getHandler(type: ProposalType): ProposalHandler<unknown> {
  const handler = registry.get(type);
  if (!handler) throw new Error(`proposal-dispatch: no handler registered for type "${type}"`);
  return handler;
}

/** Snapshot of all registered handlers; for the CLI's exhaustiveness check at startup. */
export function allHandlers(): ReadonlyArray<ProposalHandler<unknown>> {
  return [...registry.values()];
}
