import { describe, expect, it } from "vite-plus/test";
import { metadataTitle } from "../src/lib/seo.ts";

describe("metadataTitle", () => {
  it("formats page titles with the thinkinglabs template", () => {
    expect(metadataTitle("Claims")).toBe("Claims  thinkinglabs");
    expect(metadataTitle("Privacy — thinkinglabs")).toBe("Privacy  thinkinglabs");
  });

  it("removes legacy Tom title copy", () => {
    expect(metadataTitle("Claims — Tom")).toBe("Claims  thinkinglabs");
    expect(metadataTitle("Tom - Claims")).toBe("Claims  thinkinglabs");
    expect(metadataTitle("Tom Wild — Posts")).toBe("Posts  thinkinglabs");
  });

  it("does not duplicate the site title for the home page", () => {
    expect(metadataTitle("thinkinglabs")).toBe("thinkinglabs");
  });
});
