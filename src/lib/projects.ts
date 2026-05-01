import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { lastTouched } from "./git.ts";

/** Project source files live under `content/projects/<id>.md`; collection ids are `<slug>` so this composes the absolute path. */
export function projectFilePath(id: string): string {
  return resolve(process.cwd(), "content/projects", `${id}.md`);
}

/** Display date for a project: git history wins; mtime fallback keeps fresh-on-disk uncommitted files honest. */
export async function projectLastTouched(id: string): Promise<string> {
  const file = projectFilePath(id);
  const fromGit = await lastTouched(file);
  const iso =
    fromGit ??
    (await stat(file)
      .then((s) => s.mtime.toISOString())
      .catch(() => null));
  return iso ? iso.slice(0, 10) : "—";
}
