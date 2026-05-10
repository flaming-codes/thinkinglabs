import { describe, expect, it } from "vite-plus/test";
import { metadataTitle } from "../src/lib/seo.ts";

describe("metadataTitle", () => {
  it("uses an ASCII metadata separator", () => {
    expect(metadataTitle("Claims")).toBe("Claims | thinkinglabs");
    expect(metadataTitle("Posts — Tom")).toBe("Posts | thinkinglabs");
    expect(metadataTitle("Privacy — thinkinglabs")).toBe("Privacy | thinkinglabs");
  });

  it("removes legacy Tom title copy", () => {
    expect(metadataTitle("Claims — Tom")).toBe("Claims | thinkinglabs");
    expect(metadataTitle("Tom - Claims")).toBe("Claims | thinkinglabs");
    expect(metadataTitle("Tom Wild — Posts")).toBe("Posts | thinkinglabs");
  });

  it("normalizes em dash separators before metadata is emitted", () => {
    expect(metadataTitle("Calibration — Predictions")).toBe(
      "Calibration - Predictions | thinkinglabs",
    );
  });

  it("does not repeat the site name", () => {
    expect(metadataTitle("thinkinglabs")).toBe("thinkinglabs");
  });
});
