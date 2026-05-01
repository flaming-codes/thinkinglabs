import { getCollection } from "astro:content";
import { stripKindPrefix } from "./refs.ts";

/** Map of decision id → ids of decisions that `reverses` it; computed once per page-render via getCollection. */
export async function reversedByMap(): Promise<ReadonlyMap<string, ReadonlyArray<string>>> {
  const all = await getCollection("decisions");
  const out = new Map<string, string[]>();
  for (const d of all) {
    for (const target of d.data.reverses) {
      const key = stripKindPrefix(target);
      const list = out.get(key) ?? [];
      list.push(d.id);
      out.set(key, list);
    }
  }
  return out;
}
