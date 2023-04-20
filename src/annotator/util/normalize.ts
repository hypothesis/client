/**
 * Find the smallest offset in `str` which contains at least `count` chars
 * that match `filter` before it.
 */
function advance(
  str: string,
  count: number,
  filter: (char: string) => boolean,
  startPos = 0
): number {
  let pos = startPos;
  while (pos < str.length && count > 0) {
    if (filter(str[pos])) {
      --count;
    }
    ++pos;
  }
  return pos;
}

/**
 * Count characters which match `filter` in `str`.
 */
function countChars(
  str: string,
  filter: (char: string) => boolean,
  startPos: number,
  endPos: number
): number {
  let count = 0;
  for (let pos = startPos; pos < endPos; pos++) {
    if (filter(str[pos])) {
      ++count;
    }
  }
  return count;
}

/**
 * Translate a (start, end) pair of offsets for an "input" string into
 * corresponding offsets in an "output" string.
 *
 * Positions in the input and output strings are related by counting
 * the number of "important" characters before them, as determined by a
 * filter function.
 *
 * An example usage would be to find equivalent positions in two strings which
 * contain the same text content except for the addition or removal of
 * whitespace at arbitrary locations in the output string.
 *
 * Where there are multiple possible offsets in the output string that
 * correspond to the input offsets, the largest start offset and smallest end
 * offset are chosen. In other words, leading and trailing ignored characters
 * are trimmed from the output.
 *
 * @example
 *   // The input offsets (1, 3) select the substring "bc" in the "input" argument.
 *   // The returned offsets select the substring "b c" in the "output" argument.
 *   translateOffsets('abcd', ' a b c d ', 1, 3, char => char !== ' ')
 *
 * @param start - Start offset in `input`
 * @param end - End offset in `input`
 * @param filter - Filter function that returns true if a character should be
 *   counted when relating positions between `input` and `output`.
 * @return Start and end offsets in `output`
 */
export function translateOffsets(
  input: string,
  output: string,
  start: number,
  end: number,
  filter: (ch: string) => boolean
): [number, number] {
  const beforeStartCount = countChars(input, filter, 0, start);
  const startToEndCount = countChars(input, filter, start, end);

  // Find the smallest offset in `output` with same number of non-ignored characters
  // before it as before `start` in the input. This offset might correspond to
  // an ignored character.
  let outputStart = advance(output, beforeStartCount, filter);

  // Increment this offset until it points to a non-ignored character. This
  // "trims" leading ignored characters from the result.
  while (outputStart < output.length && !filter(output[outputStart])) {
    ++outputStart;
  }

  // Find smallest offset in `output` with same number of non-ignored characters
  // before it as before `end` in the input.
  const outputEnd = advance(output, startToEndCount, filter, outputStart);

  return [outputStart, outputEnd];
}
