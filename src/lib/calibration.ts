import type { Prediction } from "../schemas/prediction.ts";

/** Width of each confidence bucket; ten buckets covers [0,1] with edges at every 0.1. */
export const BUCKET_WIDTH = 0.1;

/** One calibration bucket; `accuracy` is null when `total === 0` so the renderer knows to skip the dot. */
export interface Bucket {
  readonly low: number;
  readonly high: number;
  readonly mid: number;
  readonly total: number;
  readonly correct: number;
  readonly accuracy: number | null;
}

/** Direction-correct: a prediction with confidence ≥ 0.5 is correct iff resolution=true; below 0.5 the inverse. */
export function isDirectionallyCorrect(p: Pick<Prediction, "confidence" | "resolution">): boolean | null {
  if (p.resolution === "true") return p.confidence >= 0.5;
  if (p.resolution === "false") return p.confidence < 0.5;
  return null;
}

/** Bucketed calibration over all resolved predictions; ambiguous and pending are filtered out upstream. */
export function calibration(predictions: ReadonlyArray<Pick<Prediction, "confidence" | "resolution">>): ReadonlyArray<Bucket> {
  const buckets: { low: number; high: number; mid: number; total: number; correct: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const low = i * BUCKET_WIDTH;
    const high = i === 9 ? 1.0001 : (i + 1) * BUCKET_WIDTH;
    buckets.push({ low, high, mid: low + BUCKET_WIDTH / 2, total: 0, correct: 0 });
  }
  for (const p of predictions) {
    const ok = isDirectionallyCorrect(p);
    if (ok === null) continue;
    const idx = Math.min(9, Math.floor(p.confidence / BUCKET_WIDTH));
    const b = buckets[idx];
    if (!b) continue;
    b.total += 1;
    if (ok) b.correct += 1;
  }
  return buckets.map((b) => ({
    low: b.low,
    high: b.high === 1.0001 ? 1 : b.high,
    mid: b.mid,
    total: b.total,
    correct: b.correct,
    accuracy: b.total === 0 ? null : b.correct / b.total,
  }));
}
