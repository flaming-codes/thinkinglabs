import { collectionJson } from "../../lib/api.ts";

/** JSON export for questions; delegates shape and headers to the shared collection endpoint factory. */
export const GET = collectionJson("questions");
