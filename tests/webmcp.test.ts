import { describe, expect, it, vi } from "vite-plus/test";
import { initWebMcp, ModelContextPolyfill } from "../src/frontend/thinkinglabs-ui/lib/webmcp.ts";

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
        expect(call[0]?.title).toBeDefined();
        expect(call[0]?.annotations?.readOnlyHint).toBe(true);
        expect(call[1]?.signal).toBeDefined();
      }
    } finally {
      (globalThis as any).document = originalDoc;
    }
  });

  it("registers tools when navigator.modelContext is present", () => {
    const registerTool = vi.fn();
    const mockNavigator = {
      modelContext: {
        registerTool,
      },
    };

    const originalDoc = globalThis.document;
    const navDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    try {
      (globalThis as any).document = {};
      Object.defineProperty(globalThis, "navigator", {
        value: mockNavigator,
        configurable: true,
        writable: true,
      });
      initWebMcp();

      expect(registerTool).toHaveBeenCalled();
      const registeredNames = registerTool.mock.calls.map((c: any) => c[0]?.name);
      expect(registeredNames).toContain("search_content");
      expect(registeredNames).toContain("get_page_markdown");
      expect(registeredNames).toContain("precheck_contact_inquiry");
    } finally {
      (globalThis as any).document = originalDoc;
      if (navDescriptor) {
        Object.defineProperty(globalThis, "navigator", navDescriptor);
      }
    }
  });

  it("installs polyfill and exposes tools when native modelContext is absent", async () => {
    const originalDoc = globalThis.document;
    const navDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    try {
      const mockDoc: any = {};
      const mockNav: any = {};
      (globalThis as any).document = mockDoc;
      Object.defineProperty(globalThis, "navigator", {
        value: mockNav,
        configurable: true,
        writable: true,
      });

      initWebMcp();

      expect(mockDoc.modelContext).toBeDefined();
      expect(mockDoc.modelContext.polyfilled).toBe(true);
      const tools = await mockDoc.modelContext.getTools();
      expect(tools.length).toBe(3);
      const names = tools.map((t: any) => t.name);
      expect(names).toContain("search_content");
      expect(names).toContain("get_page_markdown");
      expect(names).toContain("precheck_contact_inquiry");
    } finally {
      (globalThis as any).document = originalDoc;
      if (navDescriptor) {
        Object.defineProperty(globalThis, "navigator", navDescriptor);
      }
    }
  });

  it("ModelContextPolyfill executes tools properly", async () => {
    const polyfill = new ModelContextPolyfill();
    const testTool = {
      name: "echo",
      title: "Echo Tool",
      description: "Echoes input",
      inputSchema: { type: "object" },
      execute: async ({ text }: { text: string }) => `Echo: ${text}`,
    };

    await polyfill.registerTool(testTool);
    const tools = await polyfill.getTools();
    expect(tools.length).toBe(1);
    expect(tools[0]?.name).toBe("echo");

    const result = await polyfill.executeTool("echo", { text: "hello" });
    expect(result).toBe("Echo: hello");
  });
});
