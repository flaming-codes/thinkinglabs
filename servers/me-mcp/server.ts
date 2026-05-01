import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  contactPrecheckInputSchema,
  contactSendInputSchema,
  handleContactPrecheck,
  handleContactSend,
  handleQueryView,
  handleSubscribeBrainDiff,
  queryViewInputSchema,
  subscribeBrainDiffInputSchema,
} from "./handlers.ts";
import { queryView } from "./store.ts";
import { publicViewSchema, type PublicView } from "./types.ts";

export interface MeMcpServerOptions {
  readonly repoRoot?: string;
}

const PUBLIC_VIEWS = publicViewSchema.options;

/** Create the personal MCP server with public resources and testable tool handlers. */
export function createMeMcpServer(options: MeMcpServerOptions = {}): McpServer {
  const repoRoot = options.repoRoot ?? process.cwd();
  const server = new McpServer({ name: "me-mcp", version: "0.1.0" });
  for (const view of PUBLIC_VIEWS) registerViewResource(server, repoRoot, view);
  server.registerTool("query_view", {
    title: "Query public view",
    description: "Query public thoughts, claims, projects, decisions, predictions, inputs, or current focus.",
    inputSchema: queryViewInputSchema,
  }, (args) => handleQueryView({ repoRoot }, args));
  server.registerTool("contact.precheck", {
    title: "Precheck contact intent",
    description: "Check an inquiry against the public contact policy before sending.",
    inputSchema: contactPrecheckInputSchema,
  }, (args) => handleContactPrecheck({ repoRoot }, args));
  server.registerTool("contact.send", {
    title: "Prepare contact handoff",
    description: "Validate a contact message and return the public handoff channel; no email is sent by the server.",
    inputSchema: contactSendInputSchema,
  }, (args) => handleContactSend({ repoRoot }, args));
  server.registerTool("subscribe_brain_diff", {
    title: "Subscribe to brain diff",
    description: "Return public brain-diff feed URLs and optionally recent deterministic entries.",
    inputSchema: subscribeBrainDiffInputSchema,
  }, (args) => handleSubscribeBrainDiff({ repoRoot }, args));
  return server;
}

function registerViewResource(server: McpServer, repoRoot: string, view: PublicView): void {
  server.registerResource(view, `me://${view}`, {
    title: `me:${view}`,
    description: `Public ${view} view from the personal repo.`,
    mimeType: "application/json",
  }, () => {
    const value = queryView(repoRoot, { view, limit: 50 });
    return { contents: [{ uri: `me://${view}`, mimeType: "application/json", text: JSON.stringify(value, null, 2) }] };
  });
}
