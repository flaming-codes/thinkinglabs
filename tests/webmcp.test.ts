import { describe, expect, it, vi } from "vite-plus/test";
import { initWebMcp } from "../src/frontend/thinkinglabs-ui/lib/webmcp.ts";

describe("WebMCP client registration", () => {
  it("registers tools when document.modelContext is present", () => {
    const registerTool = vi.fn();
    const mockDocument = {
      modelContext: {
        registerTool,
      },
    };

    const originalDoc = globalThis.document;
    try {
      (globalThis as any).document = mockDocument;
      initWebMcp();

      expect(registerTool).toHaveBeenCalled();
      const registeredNames = registerTool.mock.calls.map((c: any) => c[0]?.name);
      expect(registeredNames).toContain("search_content");
      expect(registeredNames).toContain("get_page_markdown");
      expect(registeredNames).toContain("precheck_contact_inquiry");

      for (const call of registerTool.mock.calls) {
        expect(call[0]?.annotations?.readOnlyHint).toBe(true);
        expect(call[1]?.signal).toBeDefined();
      }
    } finally {
      (globalThis as any).document = originalDoc;
    }
  });

  it("safely no-ops when document.modelContext is absent", () => {
    const originalDoc = globalThis.document;
    try {
      (globalThis as any).document = {};
      expect(() => initWebMcp()).not.toThrow();
    } finally {
      (globalThis as any).document = originalDoc;
    }
  });
});
