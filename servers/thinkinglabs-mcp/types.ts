import { z } from "zod";
import { PUBLIC_VIEWS, type PublicViewName } from "../../src/lib/registry.ts";

/** Tuple of public view names derived from the registry; coerced to zod's required `[T, ...T[]]` tuple shape. */
const VIEW_NAMES = PUBLIC_VIEWS.map((v) => v.view) as unknown as readonly [
  PublicViewName,
  ...PublicViewName[],
];

/** Public view names exposed as fixed MCP resources and query_view targets. */
export const publicViewSchema = z.enum(VIEW_NAMES);

/** Inferred public view union from the MCP view schema. */
export type PublicView = PublicViewName;

/** Query parameters for the public query_view tool. */
export interface QueryViewArgs {
  readonly view: PublicView;
  readonly query?: string | undefined;
  readonly tags?: ReadonlyArray<string> | undefined;
  readonly limit?: number | undefined;
}

/** One object returned from a public MCP view. */
export interface ViewItem {
  readonly id: string;
  readonly kind: string;
  readonly slug: string;
  readonly title: string;
  readonly url: string;
  readonly summary: string;
  readonly frontmatter: Record<string, unknown>;
  readonly body_md: string;
  readonly last_touched: string;
  readonly tags: ReadonlyArray<string>;
}

/** Query result envelope returned by view resources and query_view. */
export interface ViewResult {
  readonly view: PublicView;
  readonly source: "sqlite" | "source";
  readonly count: number;
  readonly items: ReadonlyArray<ViewItem>;
}

/** Minimal SDK-compatible text tool result with optional structured content. */
export interface ToolTextResult {
  readonly [key: string]: unknown;
  readonly content: Array<{ type: "text"; text: string }>;
  readonly structuredContent?: { [key: string]: unknown };
  readonly isError?: boolean;
}
