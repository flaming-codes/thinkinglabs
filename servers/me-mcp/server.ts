import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  contactPrecheckInputSchema,
  contactSendInputSchema,
  handleContactPrecheck,
  handleContactSend,
  handleQuestionSubmit,
  handleQueryView,
  handleSubscribeBrainDiff,
  questionSubmitInputSchema,
  queryViewInputSchema,
  subscribeBrainDiffInputSchema,
} from "./handlers.ts";
import { getObject, predictionCalibration, queryView } from "./store.ts";
import type { PublicView } from "./types.ts";

/** Options controlling which checkout the MCP server reads. */
export interface MeMcpServerOptions {
  readonly repoRoot?: string;
}

const DETAIL_KINDS = ["thoughts", "claims", "projects", "decisions", "predictions", "inputs", "questions"] as const;
const STATIC_RESOURCES = [
  ["thoughts", "me://thoughts"],
  ["claims", "me://claims"],
  ["projects", "me://projects"],
  ["decisions", "me://decisions"],
  ["predictions", "me://predictions"],
  ["inputs", "me://inputs"],
  ["inputs_recent", "me://inputs/recent"],
  ["questions", "me://questions"],
  ["current_focus", "me://current_focus"],
  ["claims_recent", "me://claims/recent"],
  ["projects_active", "me://projects/active"],
  ["decisions_recent", "me://decisions/recent"],
  ["predictions_pending", "me://predictions/pending"],
  ["predictions_resolved", "me://predictions/resolved"],
] as const satisfies ReadonlyArray<readonly [PublicView, string]>;

/** Create the personal MCP server with public resources and testable tool handlers. */
export function createMeMcpServer(options: MeMcpServerOptions = {}): McpServer {
  const repoRoot = options.repoRoot ?? process.cwd();
  const server = new McpServer({ name: "me-mcp", version: "0.1.0" });
  for (const [view, uri] of STATIC_RESOURCES) registerViewResource(server, repoRoot, view, uri);
  for (const kind of DETAIL_KINDS) registerDetailResource(server, repoRoot, kind);
  registerClaimsByTagResource(server, repoRoot);
  registerSchemaVersionResource(server);
  registerCalibrationResource(server, repoRoot);
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
  server.registerTool("question.submit", {
    title: "Submit answer to open question",
    description: "Write a structured reader answer into submissions/questions for later triage.",
    inputSchema: questionSubmitInputSchema,
  }, (args) => handleQuestionSubmit({ repoRoot }, args));
  return server;
}

function registerViewResource(server: McpServer, repoRoot: string, view: PublicView, uri: string): void {
  server.registerResource(view, uri, {
    title: `me:${view}`,
    description: `Public ${view} view from the personal repo.`,
    mimeType: "application/json",
  }, () => {
    const value = queryView(repoRoot, { view, limit: 50 });
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(value, null, 2) }] };
  });
}

function registerClaimsByTagResource(server: McpServer, repoRoot: string): void {
  server.registerResource("claims-by-tag", new ResourceTemplate("me://claims/by-tag/{tag}", { list: undefined }), {
    title: "me:claims/by-tag/{tag}",
    description: "Claims filtered by one tag.",
    mimeType: "application/json",
  }, (_uri, variables) => {
    const tag = String(variables["tag"] ?? "");
    const value = queryView(repoRoot, { view: "claims_by_tag", tags: [tag], limit: 50 });
    return { contents: [{ uri: `me://claims/by-tag/${tag}`, mimeType: "application/json", text: JSON.stringify(value, null, 2) }] };
  });
}

function registerDetailResource(server: McpServer, repoRoot: string, kind: typeof DETAIL_KINDS[number]): void {
  server.registerResource(`${kind}-detail`, new ResourceTemplate(`me://${kind}/{slug}`, {
    list: () => ({
      resources: queryView(repoRoot, { view: kind, limit: 50 }).items.map((item) => ({
        uri: `me://${kind}/${item.slug}`,
        name: item.id,
        title: item.title,
        mimeType: "application/json",
      })),
    }),
  }), {
    title: `me:${kind}/{slug}`,
    description: `Single ${kind} object by slug.`,
    mimeType: "application/json",
  }, (_uri, variables) => {
    const slug = String(variables["slug"] ?? "");
    const value = getObject(repoRoot, kind, slug);
    return { contents: [{ uri: `me://${kind}/${slug}`, mimeType: "application/json", text: JSON.stringify(value ?? { error: "not found", kind, slug }, null, 2) }] };
  });
}

function registerSchemaVersionResource(server: McpServer): void {
  server.registerResource("schema-version", "me://schema/version", {
    title: "me:schema/version",
    description: "MCP schema version for consumers that pin contracts.",
    mimeType: "application/json",
  }, () => ({
    contents: [{ uri: "me://schema/version", mimeType: "application/json", text: JSON.stringify({ schema_version: "0.1.0", public_only: true, auth: "disabled" }, null, 2) }],
  }));
}

function registerCalibrationResource(server: McpServer, repoRoot: string): void {
  server.registerResource("predictions-calibration", "me://predictions/calibration", {
    title: "me:predictions/calibration",
    description: "Calibration data derived from resolved predictions.",
    mimeType: "application/json",
  }, () => ({
    contents: [{ uri: "me://predictions/calibration", mimeType: "application/json", text: JSON.stringify(predictionCalibration(repoRoot), null, 2) }],
  }));
}
