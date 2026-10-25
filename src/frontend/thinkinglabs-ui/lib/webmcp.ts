import { onPageReady } from "./page-lifecycle.ts";

let activeController: AbortController | null = null;

interface ToolRegistrationDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: any) => Promise<unknown> | unknown;
  annotations?: {
    readOnlyHint?: boolean;
    consequentialHint?: boolean;
    untrustedContentHint?: boolean;
  };
}

const TOOLS: ToolRegistrationDef[] = [
  {
    name: "search_content",
    description:
      "Searches public claims and thoughts on thinkinglabs.run by keyword, concept, or tag.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keyword, topic, or question to find in public knowledge",
        },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true },
    execute: async ({ query }: { query?: string }) => {
      if (!query || typeof query !== "string") {
        return { error: "Query parameter is required" };
      }
      const q = query.toLowerCase().trim();
      try {
        const [claimsRes, thoughtsRes] = await Promise.all([
          fetch("/api/claims.json"),
          fetch("/api/thoughts.json"),
        ]);
        const [claims, thoughts] = await Promise.all([
          claimsRes.ok ? claimsRes.json() : [],
          thoughtsRes.ok ? thoughtsRes.json() : [],
        ]);

        const matchedClaims = (Array.isArray(claims) ? claims : [])
          .filter((c: any) => {
            const claimText = (c.data?.claim ?? c.claim ?? "").toString();
            const claimTags = (c.data?.tags ?? c.tags ?? []) as string[];
            const claimId = (c.id ?? "").toString();
            const text = `${claimText} ${claimId} ${claimTags.join(" ")}`.toLowerCase();
            return text.includes(q);
          })
          .slice(0, 5)
          .map((c: any) => ({
            type: "claim",
            title: c.data?.claim ?? c.claim ?? c.id,
            url: `/claims/${c.id}`,
            markdownUrl: `/claims/${c.id}.md`,
            confidence: c.data?.confidence ?? c.confidence,
            status: c.data?.status ?? c.status,
          }));

        const matchedThoughts = (Array.isArray(thoughts) ? thoughts : [])
          .filter((t: any) => {
            const thoughtTitle = (t.data?.title ?? t.title ?? "").toString();
            const thoughtSummary = (t.data?.summary ?? t.summary ?? "").toString();
            const thoughtTags = (t.data?.tags ?? t.tags ?? []) as string[];
            const thoughtId = (t.id ?? "").toString();
            const text =
              `${thoughtTitle} ${thoughtSummary} ${thoughtId} ${thoughtTags.join(" ")}`.toLowerCase();
            return text.includes(q);
          })
          .slice(0, 5)
          .map((t: any) => ({
            type: "thought",
            title: t.data?.title ?? t.title ?? t.id,
            url: `/thoughts/${t.id}`,
            markdownUrl: `/thoughts/${t.id}.md`,
            summary: t.data?.summary ?? t.summary,
          }));

        return {
          query,
          total_matches: matchedClaims.length + matchedThoughts.length,
          claims: matchedClaims,
          thoughts: matchedThoughts,
        };
      } catch (err: any) {
        return { error: `Failed to search content: ${err?.message ?? "unknown error"}` };
      }
    },
  },
  {
    name: "get_page_markdown",
    description:
      "Fetches the clean Markdown variant of a given page on thinkinglabs.run with frontmatter and token estimates.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Page route to fetch markdown for, e.g. '/', '/about', '/now', '/agents', or '/claims/xyz'",
        },
      },
      required: ["path"],
    },
    annotations: { readOnlyHint: true },
    execute: async ({ path }: { path?: string }) => {
      if (!path || typeof path !== "string") {
        return { error: "Path parameter is required" };
      }
      let cleanPath = path.trim().replace(/\/$/, "");
      if (!cleanPath.startsWith("/")) cleanPath = `/${cleanPath}`;
      if (cleanPath === "/" || cleanPath === "") cleanPath = "/index";
      const mdUrl = cleanPath.endsWith(".md") ? cleanPath : `${cleanPath}.md`;

      try {
        const res = await fetch(mdUrl);
        if (!res.ok) {
          return { error: `HTTP ${res.status}: Markdown route not found for ${path}` };
        }
        const text = await res.text();
        const tokenEstimate = res.headers.get("x-agent-token-estimate");
        return {
          path,
          markdownUrl: mdUrl,
          approx_token_count: tokenEstimate
            ? parseInt(tokenEstimate, 10)
            : Math.ceil(text.length / 4),
          content: text,
        };
      } catch (err: any) {
        return { error: `Failed to fetch markdown: ${err?.message ?? "unknown error"}` };
      }
    },
  },
  {
    name: "precheck_contact_inquiry",
    description:
      "Preflights an inbound message against the author's published contact policy, routing rules, and fastest-no criteria.",
    inputSchema: {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description: "Subject or summary of the proposed inquiry",
        },
        message: {
          type: "string",
          description: "Full proposed inquiry message body",
        },
      },
      required: ["subject", "message"],
    },
    annotations: { readOnlyHint: true },
    execute: async ({ subject, message }: { subject?: string; message?: string }) => {
      if (!subject || !message) {
        return { error: "Both subject and message are required" };
      }
      try {
        const res = await fetch("/contact.json");
        const policy = res.ok ? await res.json() : null;
        const lowerMsg = `${subject} ${message}`.toLowerCase();

        const matchesFastNo = policy?.fastest_no
          ? lowerMsg.includes("synergy") ||
            lowerMsg.includes("quick call") ||
            lowerMsg.includes("coffee")
          : false;

        const fitsPriority =
          lowerMsg.includes("ai") ||
          lowerMsg.includes("agent") ||
          lowerMsg.includes("mcp") ||
          lowerMsg.includes("infrastructure") ||
          lowerMsg.includes("wild");

        return {
          fastest_no_policy:
            policy?.fastest_no ?? "Vague requests are easier to decline than to triage.",
          assessment: matchesFastNo
            ? "decline_likely"
            : fitsPriority
              ? "high_relevance"
              : "queued_for_review",
          recommendation: fitsPriority
            ? "Proceed to send email to the address listed in /contact."
            : "Refine message to provide concrete context, artifacts, and a clear reason before reaching out.",
          channels: policy?.channels ?? [],
        };
      } catch (err: any) {
        return { error: `Failed to load contact policy: ${err?.message ?? "unknown error"}` };
      }
    },
  },
];

/** Initializes browser-native WebMCP tool registrations on supporting browsers. */
export function initWebMcp(): void {
  if (typeof document === "undefined") return;

  const doc = document as any;
  if (!doc.modelContext || typeof doc.modelContext.registerTool !== "function") {
    return;
  }

  activeController?.abort();
  activeController = new AbortController();
  const { signal } = activeController;

  for (const tool of TOOLS) {
    try {
      doc.modelContext.registerTool(
        {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          execute: tool.execute,
          annotations: tool.annotations,
        },
        { signal },
      );
    } catch {
      //! Graceful fallback if tool is already registered or flags are restricted.
    }
  }
}

if (typeof document !== "undefined") {
  onPageReady(initWebMcp);
}
