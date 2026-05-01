/** Embed capability names allowed in public contracts. */
export type EmbeddedCapability = "static-json" | "local-calibration-log";

/** Embed write scope; embedded agents may not mutate repository or server state. */
export type EmbeddedWriteScope = "none" | "browser-local-only";

/** Public boundary for a scoped embedded agent. */
export interface EmbeddedAgentScope {
  readonly endpoint: string;
  readonly storageKey: string | null;
  readonly capabilities: readonly EmbeddedCapability[];
  readonly writeScope: EmbeddedWriteScope;
}

/** Text and tabular content rendered before any client script runs. */
export interface EmbeddedFallback {
  readonly status: string;
  readonly rows: readonly EmbeddedFallbackRow[];
}

/** One stable no-JS row for an embedded tool fallback. */
export interface EmbeddedFallbackRow {
  readonly label: string;
  readonly value: string;
}

/** Reusable public contract shared by components, API routes, and tests. */
export interface EmbeddedToolContract {
  readonly id: string;
  readonly title: string;
  readonly kind: string;
  readonly version: number;
  readonly summary: string;
  readonly scope: EmbeddedAgentScope;
  readonly fallback: EmbeddedFallback;
}

/** Public payload served to the component and static JSON endpoint. */
export interface EmbeddedToolPayload<Data = unknown> {
  readonly contract: EmbeddedToolContract;
  readonly data: Data;
}

/** Creates an embedded tool payload after checking the public scope invariants. */
export function defineEmbeddedTool<Data>(payload: EmbeddedToolPayload<Data>): EmbeddedToolPayload<Data> {
  assertEmbedContract(payload.contract);
  return payload;
}

/** Rejects contracts that would escape the static embed boundary. */
export function assertEmbedContract(contract: EmbeddedToolContract): void {
  if (!/^[a-z0-9-]+$/.test(contract.id)) throw new Error(`Invalid embed id: ${contract.id}`);
  if (contract.scope.endpoint !== `/api/embed/${contract.id}.json`) throw new Error(`Embed endpoint must match id: ${contract.id}`);
  if (contract.version < 1 || !Number.isInteger(contract.version)) throw new Error(`Invalid embed version: ${contract.id}`);
  if (contract.scope.writeScope === "browser-local-only" && !contract.scope.storageKey) throw new Error(`Local embed needs storage key: ${contract.id}`);
  if (contract.scope.writeScope === "none" && contract.scope.storageKey) throw new Error(`Read-only embed cannot reserve storage: ${contract.id}`);
}
