/**
 * Returns the "word" right before a specific position in an input string.
 *
 * In this context, a word is anything between a space, newline or tab, and
 * provided position.
 */
export function termBeforePosition(text: string, position: number): string {
  return text.slice(0, position).match(/\S+$/)?.[0] ?? '';
}

export type WordOffsets = {
  start: number;
  end: number;
};

/**
 * Returns the `start` and `end` positions for the word that overlaps with
 * provided reference position.
 *
 * For example, given the text "hello hypothesis", and the reference position 9
 * (which corresponds to the `p` character) it will return the start and end of
 * the word `hypothesis`, hence { start: 6, end: 16 }.
 *
 * Useful to get the offsets of the word matching the caret position in text
 * inputs and textareas.
 */
export function getContainingWordOffsets(
  text: string,
  referencePosition: number,
): WordOffsets {
  const precedingEmptyCharPos = text
    .slice(0, referencePosition)
    .search(/\s\S*$/);
  const subsequentEmptyCharPos = text.slice(referencePosition).search(/\s/);

  return {
    start: (precedingEmptyCharPos === -1 ? -1 : precedingEmptyCharPos) + 1,
    end:
      subsequentEmptyCharPos === -1
        ? text.length
        : referencePosition + subsequentEmptyCharPos,
  };
}
