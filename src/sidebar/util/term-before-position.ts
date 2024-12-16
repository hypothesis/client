/**
 * Returns the "word" right before a specific position in an input string.
 *
 * In this context, a word is anything between a space or newline, and provided
 * position.
 */
export function termBeforePosition(text: string, position: number): string {
  return text.slice(0, position).match(/\S+$/)?.[0] ?? '';
}
