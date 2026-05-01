import { z } from "zod";

export const publicViewSchema = z.enum(["thoughts", "claims", "projects", "decisions", "predictions", "inputs", "current_focus"]);

export type PublicView = z.infer<typeof publicViewSchema>;

export interface QueryViewArgs {
  readonly view: PublicView;
  readonly query?: string | undefined;
  readonly tags?: ReadonlyArray<string> | undefined;
  readonly limit?: number | undefined;
}

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

export interface ViewResult {
  readonly view: PublicView;
  readonly source: "sqlite" | "source";
  readonly count: number;
  readonly items: ReadonlyArray<ViewItem>;
}

export interface ToolTextResult {
  readonly [key: string]: unknown;
  readonly content: Array<{ type: "text"; text: string }>;
  readonly structuredContent?: { [key: string]: unknown };
  readonly isError?: boolean;
}
