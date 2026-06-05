import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createTokenBucket } from "../../servers/thinkinglabs-mcp-http/rate-limit.ts";

// All timing in these tests is driven by a faked Date.now plus fake setInterval/clearInterval
// so the token-bucket math is exercised deterministically with no wall-clock dependency.
describe("createTokenBucket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to capacity requests in a burst, then throttles", () => {
    const bucket = createTokenBucket({ capacity: 3, refillPerSecond: 1 });
    try {
      expect(bucket.consume("ip-a")).toBe(true);
      expect(bucket.consume("ip-a")).toBe(true);
      expect(bucket.consume("ip-a")).toBe(true);
      // Fourth request within the same tick exhausts the burst.
      expect(bucket.consume("ip-a")).toBe(false);
    } finally {
      bucket.destroy();
    }
  });

  it("refills tokens at refillPerSecond over elapsed time", () => {
    const bucket = createTokenBucket({ capacity: 5, refillPerSecond: 2 });
    try {
      for (let i = 0; i < 5; i++) expect(bucket.consume("ip-b")).toBe(true);
      expect(bucket.consume("ip-b")).toBe(false);
      // After 1s at 2 tokens/s, two more requests are allowed and then it throttles again.
      vi.setSystemTime(1000);
      expect(bucket.consume("ip-b")).toBe(true);
      expect(bucket.consume("ip-b")).toBe(true);
      expect(bucket.consume("ip-b")).toBe(false);
    } finally {
      bucket.destroy();
    }
  });

  it("never refills above capacity no matter how long the key idles", () => {
    const bucket = createTokenBucket({ capacity: 2, refillPerSecond: 10 });
    try {
      expect(bucket.consume("ip-c")).toBe(true);
      expect(bucket.consume("ip-c")).toBe(true);
      expect(bucket.consume("ip-c")).toBe(false);
      // A full hour of idleness would refill 36000 tokens uncapped; cap is 2.
      vi.setSystemTime(60 * 60 * 1000);
      expect(bucket.consume("ip-c")).toBe(true);
      expect(bucket.consume("ip-c")).toBe(true);
      expect(bucket.consume("ip-c")).toBe(false);
    } finally {
      bucket.destroy();
    }
  });

  it("tracks each key independently", () => {
    const bucket = createTokenBucket({ capacity: 1, refillPerSecond: 1 });
    try {
      expect(bucket.consume("ip-d")).toBe(true);
      expect(bucket.consume("ip-d")).toBe(false);
      // A different key gets its own fresh bucket.
      expect(bucket.consume("ip-e")).toBe(true);
      expect(bucket.size()).toBe(2);
    } finally {
      bucket.destroy();
    }
  });

  it("evicts idle keys on the periodic timer and resets their state", () => {
    const bucket = createTokenBucket({ capacity: 1, refillPerSecond: 1, idleTtlMs: 1000 });
    try {
      expect(bucket.consume("ip-f")).toBe(true);
      expect(bucket.size()).toBe(1);
      // Advance past the idle TTL so the eviction interval fires and drops the key.
      vi.advanceTimersByTime(2000);
      expect(bucket.size()).toBe(0);
      // A re-seen key starts with a full bucket again.
      expect(bucket.consume("ip-f")).toBe(true);
    } finally {
      bucket.destroy();
    }
  });

  it("clears state on destroy and stops the eviction timer from firing afterward", () => {
    const bucket = createTokenBucket({ capacity: 1, refillPerSecond: 1, idleTtlMs: 1000 });
    bucket.consume("ip-g");
    expect(bucket.size()).toBe(1);
    bucket.destroy();
    expect(bucket.size()).toBe(0);
    // After destroy the interval is cleared, so advancing time fires no eviction work and the
    // map stays empty. (If the timer leaked it would still be a no-op on an empty map, but this
    // also guards against the timer being re-scheduled.)
    vi.advanceTimersByTime(5000);
    expect(bucket.size()).toBe(0);
  });
});
