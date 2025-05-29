/**
 * Find the smallest offset in `str` which contains at least `count` chars
 * that match `filter` before it.
 */
function advance(
  str: string,
  count: number,
  filter: (char: string) => boolean,
  startPos = 0,
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
  endPos: number,
): number {
  let count = 0;
  for (let pos = startPos; pos < endPos; pos++) {
    if (filter(str[pos])) {
      ++count;
    }
  }
  return count;
}

type NormalizeResult = {
  input: string;

  /** Normalized output string. */
  output: string;

  /**
   * Offsets which map from positions in {@link output} to positions in
   * {@link input}.
   *
   * This will be undefined if the input and output strings are identical.
   */
  reverseOffsets?: number[];

  /**
   * Offsets which map from positions in {@link input} to positions in
   * {@link output}.
   *
   * This will be undefined if the input and output strings are identical.
   */
  offsets?: number[];
};

/** Specifies which offsets to record in {@link normalizeWithOffsets}. */
type NormalizeOptions = {
  offsets?: boolean;
  reverseOffsets?: boolean;
};

// Map of Unicode code point to length of NFKD-decomposed representation in
// UTF-16 characters.
const nfkdLengthCache = new Map<number, number>();

/**
 * Apply Unicode normalization to an input string, tracking the mapping between
 * offsets in the output string and offsets in the input string.
 */
function normalizeWithOffsets(
  input: string,
  opts: NormalizeOptions,
): NormalizeResult {
  // Generate the normalized output string in one step. This is more efficient
  // that incrementally appending to the output string. Plus we can bail early
  // if no normalization is required.
  const output = input.normalize('NFKD');
  if (output === input) {
    return { input, output };
  }

  const reverseOffsets = [];
  const offsets = [];
  let inOffset = 0;
  let outOffset = 0;

  for (const ch of input) {
    // We use a decomposition normalization here so that we can process each
    // Unicode character (note: not UTF-16 character) of the input separately.
    const codePoint = ch.codePointAt(0)!;
    let decomposedLen = nfkdLengthCache.get(codePoint);
    if (decomposedLen === undefined) {
      decomposedLen = ch.normalize('NFKD').length;
      nfkdLengthCache.set(codePoint, decomposedLen);
    }

    if (opts.offsets) {
      for (let i = 0; i < ch.length; i++) {
        offsets.push(outOffset);
      }
      outOffset += decomposedLen;
    }

    if (opts.reverseOffsets) {
      for (let i = 0; i < decomposedLen; i++) {
        reverseOffsets.push(inOffset);
      }
      inOffset += ch.length;
    }
  }

  // Add offset for end of string.
  if (opts.offsets) {
    offsets.push(output.length);
  }
  if (opts.reverseOffsets) {
    reverseOffsets.push(inOffset);
  }

  return { input, output, reverseOffsets, offsets };
}

export type TranslateOffsetOptions = {
  /**
   * Whether to apply Unicode normalization to the input and output before
   * translating offsets.
   *
   * Disabling normalization avoids unnecessary work if the input and output
   * are known to already be normalized in the same way.
   */
  normalize?: boolean;
};

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
 * This function can optionally apply Unicode normalization to its inputs. This
 * allows for relating positions between input strings with different
 * representations of the same character. For example `input` may contain "fi"
 * as two separate characters and `output` may contain a combined "ﬁ" ligature.
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
  filter: (ch: string) => boolean,
  options: TranslateOffsetOptions = {},
): [number, number] {
  start = Math.max(0, Math.min(start, input.length));
  end = Math.max(start, Math.min(end, input.length));

  const normInput: NormalizeResult = options.normalize
    ? normalizeWithOffsets(input, { offsets: true })
    : { input, output: input };
  const normOutput = options.normalize
    ? normalizeWithOffsets(output, { reverseOffsets: true })
    : { input, output };

  const normStart = normInput.offsets?.[start] ?? start;
  const normEnd = normInput.offsets?.[end] ?? end;

  const beforeStartCount = countChars(normInput.output, filter, 0, normStart);
  const startToEndCount = countChars(
    normInput.output,
    filter,
    normStart,
    normEnd,
  );

  // Find the smallest offset in `output` with same number of non-ignored characters
  // before it as before `start` in the input. This offset might correspond to
  // an ignored character.
  let outputStart = advance(normOutput.output, beforeStartCount, filter);

  // Increment this offset until it points to a non-ignored character. This
  // "trims" leading ignored characters from the result.
  while (
    outputStart < normOutput.output.length &&
    !filter(normOutput.output[outputStart])
  ) {
    ++outputStart;
  }

  // Find smallest offset in `output` with same number of non-ignored characters
  // before it as before `end` in the input.
  const outputEnd = advance(
    normOutput.output,
    startToEndCount,
    filter,
    outputStart,
  );

  const unnormOutputStart =
    normOutput.reverseOffsets?.[outputStart] ?? outputStart;
  const unnormOutputEnd = normOutput.reverseOffsets?.[outputEnd] ?? outputEnd;

  return [unnormOutputStart, unnormOutputEnd];
}
