import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contactSchema, type Contact } from "../schemas/contact.ts";

/** Reads and validates `public/contact.json` once per build; throws with Zod issues if the structure drifts. */
export function loadContact(): Contact {
  const file = resolve(process.cwd(), "public/contact.json");
  const raw = readFileSync(file, "utf8");
  return contactSchema.parse(JSON.parse(raw));
}
