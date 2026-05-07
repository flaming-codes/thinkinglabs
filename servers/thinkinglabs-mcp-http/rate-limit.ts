/** Options for an in-memory per-key token bucket. */
export interface TokenBucketOptions {
  /** Maximum tokens in the bucket (burst size). */
  readonly capacity: number;
  /** Tokens added per second. Steady-state requests-per-second per key. */
  readonly refillPerSecond: number;
  /** Drop a key from the map after this many ms of idleness. Default: 10 minutes. */
  readonly idleTtlMs?: number;
}

interface BucketState {
  tokens: number;
  lastRefillMs: number;
}

/** In-memory per-key token bucket. */
export interface TokenBucket {
  readonly consume: (key: string) => boolean;
  readonly size: () => number;
  /** Stop the periodic eviction timer. Call when the server shuts down. */
  readonly destroy: () => void;
}

/** Create a token bucket that refills on each consume and periodically evicts idle keys. */
export function createTokenBucket(options: TokenBucketOptions): TokenBucket {
  const { capacity, refillPerSecond } = options;
  const idleTtlMs = options.idleTtlMs ?? 10 * 60 * 1000;
  const buckets = new Map<string, BucketState>();

  const evictTimer = setInterval(() => {
    evictIdle(buckets, Date.now(), idleTtlMs);
  }, idleTtlMs);
  evictTimer.unref();

  return {
    consume(key) {
      const now = Date.now();
      let state = buckets.get(key);
      if (state === undefined) {
        state = { tokens: capacity, lastRefillMs: now };
        buckets.set(key, state);
      } else {
        const elapsed = (now - state.lastRefillMs) / 1000;
        state.tokens = Math.min(capacity, state.tokens + elapsed * refillPerSecond);
        state.lastRefillMs = now;
      }
      if (state.tokens < 1) return false;
      state.tokens -= 1;
      return true;
    },
    size() {
      return buckets.size;
    },
    destroy() {
      clearInterval(evictTimer);
      buckets.clear();
    },
  };
}

function evictIdle(buckets: Map<string, BucketState>, now: number, idleTtlMs: number): void {
  for (const [key, state] of buckets) {
    if (now - state.lastRefillMs > idleTtlMs) buckets.delete(key);
  }
}
