import { describe, expect, it } from "vite-plus/test";
import { calibration, isDirectionallyCorrect } from "../src/lib/calibration.ts";

describe("calibration", () => {
  it("returns ten empty buckets when there are no predictions", () => {
    const out = calibration([]);
    expect(out).toHaveLength(10);
    expect(out.every((b) => b.total === 0 && b.accuracy === null)).toBe(true);
  });

  it("scores all-correct-at-0.9 as accuracy 1 in the 0.9 bucket only", () => {
    const out = calibration([
      { confidence: 0.9, resolution: "true" },
      { confidence: 0.9, resolution: "true" },
      { confidence: 0.9, resolution: "true" },
    ]);
    const top = out[9]!;
    expect(top.total).toBe(3);
    expect(top.accuracy).toBe(1);
    for (let i = 0; i < 9; i++) expect(out[i]!.total).toBe(0);
  });

  it("treats low-confidence-and-false as direction-correct", () => {
    expect(isDirectionallyCorrect({ confidence: 0.1, resolution: "false" })).toBe(true);
    expect(isDirectionallyCorrect({ confidence: 0.1, resolution: "true" })).toBe(false);
    expect(isDirectionallyCorrect({ confidence: 0.7, resolution: "false" })).toBe(false);
  });

  it("perfectly-calibrated synthetic set yields accuracy ≈ midpoint per bucket", () => {
    const set: { confidence: number; resolution: "true" | "false" }[] = [];
    for (let i = 0; i < 10; i++) {
      const conf = i / 10 + 0.05;
      const trues = i;
      const falses = 10 - i;
      for (let t = 0; t < trues; t++) set.push({ confidence: conf, resolution: "true" });
      for (let f = 0; f < falses; f++) set.push({ confidence: conf, resolution: "false" });
    }
    const out = calibration(set);
    for (let i = 0; i < 10; i++) {
      const expected = i < 5 ? (10 - i) / 10 : i / 10;
      expect(out[i]!.accuracy).toBeCloseTo(expected, 5);
    }
  });

  it("ignores pending and ambiguous resolutions", () => {
    const out = calibration([
      { confidence: 0.5, resolution: "pending" },
      { confidence: 0.8, resolution: "ambiguous" },
    ]);
    expect(out.every((b) => b.total === 0)).toBe(true);
  });
});
