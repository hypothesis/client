/**
 * Parse a page number or range into a `[start, end]` integer pair. The `start`
 * or `end` may be `null` if the range is open.
 *
 * Returns `null` if the page range could not be parsed.
 */
function parseRange(range: string): [number | null, number | null] | null {
  let start;
  let end;

  if (range.includes('-')) {
    [start, end] = range.split('-');
  } else {
    start = range;
    end = range;
  }

  let startInt = null;
  if (start) {
    startInt = parseInt(start);
    if (!Number.isInteger(startInt)) {
      return null;
    }
  }

  let endInt = null;
  if (end) {
    endInt = parseInt(end);
    if (!Number.isInteger(endInt)) {
      return null;
    }
  }

  if (startInt === null || endInt === null) {
    return [startInt, endInt];
  }

  if (startInt <= endInt) {
    return [startInt, endInt];
  } else {
    return [endInt, startInt];
  }
}

/**
 * Return true if the page number `label` is within `range`.
 *
 * Returns `false` if the label is outside `range` or the relation between the
 * label and the range could not be determined.
 *
 * @param label - A page number such as "10", "iv"
 * @param range - A page range expressed as a single page number, or a hyphen
 *   separated range (eg. "10-12"). Page ranges are inclusive, so the page
 *   range "10-12" matches "10", "11" and "12". This means there is no way to
 *   specify an empty range.
 */
export function pageLabelInRange(label: string, range: string): boolean {
  return pageRangesOverlap(label, range) === true;
}

/** Convert an open range into an integer range. */
function normalizeRange(
  range: [number | null, number | null],
  min: number,
  max: number,
): [number, number] {
  return [range[0] ?? min, range[1] ?? max];
}

/**
 * Return true if two page ranges overlap.
 *
 * Each range may be specified as a single page number, or a hyphen-separated
 * range.
 *
 * Returns true if the ranges overlap, false if the ranges do not overlap, or
 * `null` if the relation could not be determined.
 */
export function pageRangesOverlap(
  rangeA: string,
  rangeB: string,
): boolean | null {
  const intRangeA = parseRange(rangeA);
  const intRangeB = parseRange(rangeB);

  if (!intRangeA || !intRangeB) {
    if (rangeA && rangeB && rangeA === rangeB) {
      // As a special case for non-numeric ranges, we consider them overlapping
      // if both are equal. This means `pageRangesOverlap("iv", "iv")` is true
      // for example.
      return true;
    }

    // We could not determine whether the ranges overlap.
    return null;
  }

  const minPage = 1;
  const maxPage = 2 ** 31;
  const [aStart, aEnd] = normalizeRange(intRangeA, minPage, maxPage);
  const [bStart, bEnd] = normalizeRange(intRangeB, minPage, maxPage);

  if (aStart <= bStart) {
    return bStart <= aEnd;
  } else {
    return aStart <= bEnd;
  }
}
