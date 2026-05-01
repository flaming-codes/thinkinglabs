import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

/** Opens `$EDITOR` (or `$VISUAL`, falling back to `vi`) on a temp file with `initial`, returns the post-edit string. */
export async function editInEditor(initial: string, suffix?: string): Promise<string> {
  const editor = process.env["EDITOR"] ?? process.env["VISUAL"] ?? "vi";
  const dir = mkdtempSync(join(tmpdir(), "derive-claims-"));
  const file = join(dir, `edit${suffix ?? ""}`);
  try {
    writeFileSync(file, initial, "utf8");
    const result = spawnSync(editor, [file], { stdio: "inherit" });
    if (result.status !== 0) throw new Error(`Editor '${editor}' exited with status ${result.status ?? "unknown"}`);
    return readFileSync(file, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
