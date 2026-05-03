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
import { MCP_PUBLIC_VIEWS, publicViewSchema, type PublicView } from "./types.ts";
import { currentModelRefs } from "../../src/lib/llm.ts";
import { DETAIL_KINDS as registryDetailKinds } from "../../src/lib/registry.ts";

/** Options controlling which checkout the MCP server reads. */
export interface ThinkinglabsMcpServerOptions {
  readonly repoRoot?: string;
}

/** MCP detail kinds derived from the kind registry. */
const DETAIL_KINDS = registryDetailKinds.filter((kind) => kind !== "provenance");

/** MCP static-view resource (view, uri) pairs derived from the kind registry. */
const STATIC_RESOURCES = MCP_PUBLIC_VIEWS.filter((v) => v.resource === "static").map(
  (v) => [v.view, v.uri] as const,
) as ReadonlyArray<readonly [PublicView, string]>;

/** Create the personal MCP server with public resources and testable tool handlers. */
export function createThinkinglabsMcpServer(options: ThinkinglabsMcpServerOptions = {}): McpServer {
  const repoRoot = options.repoRoot ?? process.cwd();
  const server = new McpServer({ name: "thinkinglabs-mcp", version: "0.1.0" });
  for (const [view, uri] of STATIC_RESOURCES) registerViewResource(server, repoRoot, view, uri);
  for (const kind of DETAIL_KINDS) registerDetailResource(server, repoRoot, kind);
  registerClaimsByTagResource(server, repoRoot);
  registerSchemaVersionResource(server);
  registerCurrentModelsResource(server);
  registerCalibrationResource(server, repoRoot);
  server.registerTool(
    "query_view",
    {
      title: "Query public view",
      description:
        "Query public thoughts, claims, projects, decisions, predictions, inputs, or current focus.",
      inputSchema: queryViewInputSchema,
    },
    (args) => handleQueryView({ repoRoot }, args),
  );
  server.registerTool(
    "contact.precheck",
    {
      title: "Precheck contact intent",
      description: "Check an inquiry against the public contact policy before sending.",
      inputSchema: contactPrecheckInputSchema,
    },
    (args) => handleContactPrecheck({ repoRoot }, args),
  );
  server.registerTool(
    "contact.send",
    {
      title: "Prepare contact handoff",
      description:
        "Validate a contact message and return the public handoff channel; no email is sent by the server.",
      inputSchema: contactSendInputSchema,
    },
    (args) => handleContactSend({ repoRoot }, args),
  );
  server.registerTool(
    "subscribe_brain_diff",
    {
      title: "Subscribe to brain diff",
      description:
        "Return public brain-diff feed URLs and optionally recent deterministic entries.",
      inputSchema: subscribeBrainDiffInputSchema,
    },
    (args) => handleSubscribeBrainDiff({ repoRoot }, args),
  );
  server.registerTool(
    "question.submit",
    {
      title: "Submit answer to open question",
      description: "Write a structured reader answer into submissions/questions for later triage.",
      inputSchema: questionSubmitInputSchema,
    },
    (args) => handleQuestionSubmit({ repoRoot }, args),
  );
  return server;
}

/** Slug pattern accepted on detail resource URIs; lowercase kebab, 1-100 chars. */
const RESOURCE_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/;

/** Tag pattern accepted on claims-by-tag URIs; allows alnum and a couple of separators. */
const RESOURCE_TAG = /^[a-z0-9][a-z0-9_.-]{0,63}$/;

function jsonResource(
  uri: string,
  value: unknown,
): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
  return {
    contents: [{ uri, mimeType: "application/json", text: JSON.stringify(value, null, 2) }],
  };
}

function resourceError(
  uri: string,
  reason: string,
  extra: Record<string, unknown> = {},
): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
  return jsonResource(uri, { error: reason, ...extra });
}

function registerViewResource(
  server: McpServer,
  repoRoot: string,
  view: PublicView,
  uri: string,
): void {
  server.registerResource(
    view,
    uri,
    {
      title: `thinkinglabs:${view}`,
      description: `Public ${view} view from the personal repo.`,
      mimeType: "application/json",
    },
    () => {
      try {
        return jsonResource(uri, queryView(repoRoot, { view, limit: 50 }));
      } catch (error) {
        return resourceError(uri, error instanceof Error ? error.message : String(error), { view });
      }
    },
  );
}

function registerClaimsByTagResource(server: McpServer, repoRoot: string): void {
  server.registerResource(
    "claims-by-tag",
    new ResourceTemplate("thinkinglabs://claims/by-tag/{tag}", { list: undefined }),
    {
      title: "thinkinglabs:claims/by-tag/{tag}",
      description: "Claims filtered by one tag.",
      mimeType: "application/json",
    },
    (_uri, variables) => {
      const tag = String(variables["tag"] ?? "").toLowerCase();
      const uri = `thinkinglabs://claims/by-tag/${tag}`;
      if (!RESOURCE_TAG.test(tag)) return resourceError(uri, "invalid tag", { tag });
      try {
        return jsonResource(
          uri,
          queryView(repoRoot, { view: "claims_by_tag", tags: [tag], limit: 50 }),
        );
      } catch (error) {
        return resourceError(uri, error instanceof Error ? error.message : String(error), { tag });
      }
    },
  );
}

function registerDetailResource(
  server: McpServer,
  repoRoot: string,
  kind: (typeof DETAIL_KINDS)[number],
): void {
  server.registerResource(
    `${kind}-detail`,
    new ResourceTemplate(`thinkinglabs://${kind}/{slug}`, {
      list: () => {
        const viewParse = publicViewSchema.safeParse(kind);
        if (!viewParse.success) return { resources: [] };
        try {
          return {
            resources: queryView(repoRoot, { view: viewParse.data, limit: 50 }).items.map(
              (item) => ({
                uri: `thinkinglabs://${kind}/${item.slug}`,
                name: item.id,
                title: item.title,
                mimeType: "application/json",
              }),
            ),
          };
        } catch {
          return { resources: [] };
        }
      },
    }),
    {
      title: `thinkinglabs:${kind}/{slug}`,
      description: `Single ${kind} object by slug.`,
      mimeType: "application/json",
    },
    (_uri, variables) => {
      const slug = String(variables["slug"] ?? "");
      const uri = `thinkinglabs://${kind}/${slug}`;
      if (!RESOURCE_SLUG.test(slug)) return resourceError(uri, "invalid slug", { kind, slug });
      try {
        const value = getObject(repoRoot, kind, slug);
        return jsonResource(uri, value ?? { error: "not found", kind, slug });
      } catch (error) {
        return resourceError(uri, error instanceof Error ? error.message : String(error), {
          kind,
          slug,
        });
      }
    },
  );
}

function registerSchemaVersionResource(server: McpServer): void {
  server.registerResource(
    "schema-version",
    "thinkinglabs://schema/version",
    {
      title: "thinkinglabs:schema/version",
      description: "MCP schema version for consumers that pin contracts.",
      mimeType: "application/json",
    },
    () =>
      jsonResource("thinkinglabs://schema/version", {
        schema_version: "0.1.0",
        public_only: true,
        auth: "disabled",
      }),
  );
}

function registerCurrentModelsResource(server: McpServer): void {
  server.registerResource(
    "ai-current-models",
    "thinkinglabs://ai/current-models",
    {
      title: "thinkinglabs:ai/current-models",
      description: "Current env-resolved LLM model refs by capability tier.",
      mimeType: "application/json",
    },
    () => jsonResource("thinkinglabs://ai/current-models", { models: currentModelRefs() }),
  );
}

function registerCalibrationResource(server: McpServer, repoRoot: string): void {
  server.registerResource(
    "predictions-calibration",
    "thinkinglabs://predictions/calibration",
    {
      title: "thinkinglabs:predictions/calibration",
      description: "Calibration data derived from resolved predictions.",
      mimeType: "application/json",
    },
    () => {
      try {
        return jsonResource(
          "thinkinglabs://predictions/calibration",
          predictionCalibration(repoRoot),
        );
      } catch (error) {
        return resourceError(
          "thinkinglabs://predictions/calibration",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  );
}
