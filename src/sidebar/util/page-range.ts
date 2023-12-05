/**
 * Return true if the page number `label` is within `range`.
 *
 * @param label - A page number such as "10", "iv"
 * @param range - A page range expressed as a single page number, or a hyphen
 *   separated range (eg. "10-12"). Page ranges are inclusive, so the page
 *   range "10-12" matches "10", "11" and "12". This means there is no way to
 *   specify an empty range.
 */
export function pageLabelInRange(label: string, range: string): boolean {
  if (!range.includes('-')) {
    return label === range;
  }

  let [start, end] = range.split('-');
  if (!start) {
    start = label;
  }
  if (!end) {
    end = label;
  }
  const [startInt, endInt, labelInt] = [
    parseInt(start),
    parseInt(end),
    parseInt(label),
  ];
  if (
    Number.isInteger(startInt) &&
    Number.isInteger(endInt) &&
    Number.isInteger(labelInt)
  ) {
    return labelInt >= startInt && labelInt <= endInt;
  } else {
    return false;
  }
}
