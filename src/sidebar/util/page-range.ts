/**
 * Parse a page number or range into a `[start, end]` integer pair. The `start`
 * or `end` may be `null` if the range is open.
 *
 * Ranges can be specified as:
 *
 *  - A single number. This is treated as a range that starts and ends on the
 *    same page.
 *  - A range that may be closed ("5-10"), half-open ("5-" or "-5") or fully
 *    open ("-").
 *
 * Returns `null` if the page range could not be parsed.
 */
function parseRange(range: string): [number | null, number | null] | null {
  if (!range) {
    return null;
  }

  const [start, end] = range.includes('-') ? range.split('-') : [range, range];

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

  return [Math.min(startInt, endInt), Math.max(startInt, endInt)];
}

/** Describes whether two page ranges overlap. */
export enum RangeOverlap {
  Overlap,
  NoOverlap,
  Unknown,
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
  return pageRangeOverlap(label, range) === RangeOverlap.Overlap;
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
export function pageRangeOverlap(rangeA: string, rangeB: string): RangeOverlap {
  const intRangeA = parseRange(rangeA);
  const intRangeB = parseRange(rangeB);

  if (!intRangeA || !intRangeB) {
    if (rangeA && rangeB && rangeA === rangeB) {
      // As a special case for non-numeric ranges, we consider them overlapping
      // if both are equal. This means `pageRangesOverlap("iv", "iv")` is true
      // for example.
      return RangeOverlap.Overlap;
    }

    // We could not determine whether the ranges overlap.
    return RangeOverlap.Unknown;
  }

  const minPage = 1;
  const maxPage = 2 ** 31;
  const [aStart, aEnd] = normalizeRange(intRangeA, minPage, maxPage);
  const [bStart, bEnd] = normalizeRange(intRangeB, minPage, maxPage);

  if (aStart <= bStart) {
    return bStart <= aEnd ? RangeOverlap.Overlap : RangeOverlap.NoOverlap;
  } else {
    return aStart <= bEnd ? RangeOverlap.Overlap : RangeOverlap.NoOverlap;
  }
}
