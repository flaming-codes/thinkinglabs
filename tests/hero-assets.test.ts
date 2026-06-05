import { describe, expect, it } from "vite-plus/test";
import {
  FALLBACK_HERO_SOURCE,
  HERO_ASSET_EXTENSIONS,
  heroAssetKeyFromPath,
  heroAssetPath,
  resolveHeroSource,
} from "../src/lib/hero-assets.ts";

describe("hero asset resolution", () => {
  it("documents the supported extension precedence", () => {
    expect(HERO_ASSET_EXTENSIONS).toEqual(["avif", "webp", "png", "jpg", "jpeg"]);
  });

  it("resolves the first existing format by configured precedence", () => {
    const existing = new Set([
      "src/assets/thoughts/agent-harness-is-the-new-ide.jpeg",
      "src/assets/thoughts/agent-harness-is-the-new-ide.png",
      "src/assets/thoughts/agent-harness-is-the-new-ide.webp",
    ]);

    expect(
      resolveHeroSource({
        folder: "thoughts",
        slug: "agent-harness-is-the-new-ide",
        exists: (path) => existing.has(path),
      }),
    ).toBe("src/assets/thoughts/agent-harness-is-the-new-ide.webp");
  });

  it("falls back to the shared hero when no custom entity asset exists", () => {
    expect(
      resolveHeroSource({
        folder: "projects",
        slug: "missing-project",
        exists: () => false,
      }),
    ).toBe(FALLBACK_HERO_SOURCE);
  });

  it("builds the documented convention path", () => {
    expect(heroAssetPath("claims", "prompt-is-spec-is-implementation", "avif")).toBe(
      "src/assets/claims/prompt-is-spec-is-implementation.avif",
    );
  });

  it("extracts extensionless asset keys only for supported formats", () => {
    expect(
      heroAssetKeyFromPath(
        "../../../assets/observations/frontier-models-follow-complex-instructions.jpg",
        "../../../assets/",
      ),
    ).toBe("observations/frontier-models-follow-complex-instructions");
    expect(
      heroAssetKeyFromPath("../../../assets/thoughts/example.gif", "../../../assets/"),
    ).toBeNull();
  });
});
