// Narrative comment.
/** Multi-line
 * block comment.
 */
export function missingDoc(): void {}
/** Has forbidden tags. @param value no tags allowed. @returns nothing. */
export function forbiddenTags(value: string): string {
  return value;
}
