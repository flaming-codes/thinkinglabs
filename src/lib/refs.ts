/** Strip the optional `<kind>/` prefix from a link reference, returning the bare slug. */
export function stripKindPrefix(ref: string): string {
  return ref.replace(/^[a-z][a-z0-9-]*\//, "");
}

/** Strip a trailing markdown extension while preserving any anchor suffix. */
export function stripMdExt(ref: string): string {
  return ref.replace(/\.md(#.*)?$/, "$1");
}
