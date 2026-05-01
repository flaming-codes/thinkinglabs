import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

interface Violation {
  readonly file: string;
  readonly message: string;
}

function tsFiles(root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) stack.push(full);
      else if (st.isFile() && full.endsWith(".ts")) out.push(full);
    }
  }
  return out.sort();
}

function exported(node: ts.Node): boolean {
  return Boolean(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
}

function exportedDeclarations(sf: ts.SourceFile): ts.Node[] {
  return sf.statements.filter((node) =>
    (ts.isFunctionDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isVariableStatement(node)) &&
    exported(node),
  );
}

function commentRanges(sf: ts.SourceFile, text: string): ts.CommentRange[] {
  const ranges = new Map<number, ts.CommentRange>();
  function add(found: ts.CommentRange[] | undefined): void {
    for (const range of found ?? []) ranges.set(range.pos, range);
  }
  function visit(node: ts.Node): void {
    add(ts.getLeadingCommentRanges(text, node.getFullStart()));
    add(ts.getTrailingCommentRanges(text, node.getEnd()));
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return [...ranges.values()].sort((a, b) => a.pos - b.pos);
}

function lintFile(file: string, root: string): Violation[] {
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const rel = relative(root, file);
  const violations: Violation[] = [];
  for (const range of commentRanges(sf, text)) {
    const comment = text.slice(range.pos, range.end);
    if (range.kind === ts.SyntaxKind.SingleLineCommentTrivia && !comment.startsWith("//!")) {
      violations.push({ file: rel, message: "single-line comments are not allowed" });
    }
    if (range.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
      if (comment.includes("\n")) violations.push({ file: rel, message: "block comments must be single-line" });
      if (/@param\b|@returns\b/.test(comment)) violations.push({ file: rel, message: "JSDoc tags are not allowed" });
    }
  }
  for (const node of exportedDeclarations(sf)) {
    const start = node.getStart(sf, false);
    const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
    const leading = ranges.filter((r) => r.end <= start);
    const docs = leading.filter((r) => text.slice(r.pos, r.end).startsWith("/**"));
    if (docs.length !== 1 || leading.length !== 1) {
      violations.push({ file: rel, message: "exported declarations need exactly one leading JSDoc block" });
    }
  }
  return violations;
}

function lintRoots(root: string, dirs: ReadonlyArray<string>): Violation[] {
  return dirs.flatMap((dir) => tsFiles(resolve(root, dir)).flatMap((file) => lintFile(file, root)));
}

describe("JSDoc and comment lint", () => {
  const root = resolve(import.meta.dirname, "..");

  it("accepts source, script, server, and embed comments", () => {
    expect(lintRoots(root, ["src", "scripts", "servers", "embeds"])).toEqual([]);
  });

  it("catches each violation type in the fixture", () => {
    const messages = lintFile(resolve(root, "tests/fixtures/lint/bad.ts"), root).map((v) => v.message);
    expect(messages).toContain("single-line comments are not allowed");
    expect(messages).toContain("block comments must be single-line");
    expect(messages).toContain("JSDoc tags are not allowed");
    expect(messages).toContain("exported declarations need exactly one leading JSDoc block");
  });
});
