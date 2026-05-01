import { collectionJson } from "../../lib/api.ts";

/** JSON export for belief revisions; delegates shape and headers to the shared collection endpoint factory. */
export const GET = collectionJson("changed-my-mind");
