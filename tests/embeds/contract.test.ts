import { describe, expect, it } from "vitest";
import { assertEmbedContract } from "../../embeds/core.ts";
import { embeddedToolIds, embeddedTools, findEmbeddedTool } from "../../embeds/index.ts";

describe("embedded scoped agent contracts", () => {
  it("registers stable unique ids", () => {
    expect(embeddedToolIds).toEqual(["prediction-calibration-logger"]);
    expect(new Set(embeddedToolIds).size).toBe(embeddedToolIds.length);
  });

  it("keeps every endpoint tied to its public id", () => {
    for (const tool of embeddedTools) {
      expect(() => assertEmbedContract(tool.contract)).not.toThrow();
      expect(tool.contract.scope.endpoint).toBe(`/api/embed/${tool.contract.id}.json`);
    }
  });

  it("limits the seed embed to local browser writes", () => {
    const tool = findEmbeddedTool("prediction-calibration-logger");
    expect(tool?.contract.scope.writeScope).toBe("browser-local-only");
    expect(tool?.contract.scope.capabilities).toEqual(["static-json", "local-calibration-log"]);
    expect(tool?.contract.scope.storageKey).toBe("me.embed.prediction-calibration-logger.v1");
  });

  it("rejects endpoint drift", () => {
    const tool = findEmbeddedTool("prediction-calibration-logger");
    expect(tool).toBeDefined();
    expect(() => assertEmbedContract({ ...tool!.contract, scope: { ...tool!.contract.scope, endpoint: "/api/embed/other.json" } })).toThrow(
      "Embed endpoint must match id",
    );
  });
});
