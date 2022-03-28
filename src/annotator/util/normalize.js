/**
 * Find the smallest offset in `str` which contains at least `count` chars
 * that match `filter` before it.
 *
 * @param {string} str
 * @param {number} count
 * @param {(char: string) => boolean} filter
 * @param {number} [startPos]
 */
function advance(str, count, filter, startPos = 0) {
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
 *
 * @param {string} str
 * @param {(char: string) => boolean} filter
 * @param {number} startPos
 * @param {number} endPos
 */
function countChars(str, filter, startPos, endPos) {
  let count = 0;
  for (let pos = startPos; pos < endPos; pos++) {
    if (filter(str[pos])) {
      ++count;
    }
  }
  return count;
}

/**
 * Translate a (start, end) pair of offsets in an input string to corresponding
 * offsets in an output string, where positions in the input and output strings
 * are related by counting the number of preceding characters that pass a
 * filter.
 *
 * In typical usage, the output string is a corrupted version of the input
 * string, where characters that do not match the filter (eg. whitespace)
 * have been inserted or deleted at arbitrary locations.
 *
 * Where there are multiple possible offsets in the output string that
 * correspond to the input offsets, the largest start offset and smallest end
 * offset are chosen.
 *
 * @example
 *   // Input offsets specify the substring "bc" in the input. Result specifies
 *   // the corresponding "b c" substring in the output.
 *   translateOffsets('abcd', ' a b c d ', 1, 3, char => char !== ' ')
 *
 * @param {string} inputStr
 * @param {string} outputStr
 * @param {number} start - Start offset in `inputStr`
 * @param {number} end - End offset in `inputStr`
 * @param {(ch: string) => boolean} filter
 * @return {[number, number]} - Start and end offsets in `outputStr`
 */
export function translateOffsets(inputStr, outputStr, start, end, filter) {
  const startCount = countChars(inputStr, filter, 0, start);
  const startToEndCount = countChars(inputStr, filter, start, end);

  // Find smallest offset with `startCount` matching chars before it in output,
  // then adjust to the largest such offset.
  let outStart = advance(outputStr, startCount, filter);
  while (outStart < outputStr.length && !filter(outputStr[outStart])) {
    ++outStart;
  }

  const outEnd = advance(outputStr, startToEndCount, filter, outStart);

  return [outStart, outEnd];
}
