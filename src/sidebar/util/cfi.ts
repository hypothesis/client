/**
 * Compare two arrays.
 *
 * Arrays are compared as a sequence of values in priority order. If the two
 * arrays are of different length but their common indexes have the same values,
 * the shorter array is considered less than the longer one.
 *
 * This logic is similar to how eg. tuples are compared in Python.
 */
function compareArrays(
  a: Array<number | string>,
  b: Array<number | string>
): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) {
      continue;
    } else if (a[i] < b[i]) {
      return -1;
    } else if (a[i] > b[i]) {
      return 1;
    }
  }
  return a.length - b.length;
}

/**
 * Strip assertions from a Canonical Fragment Identifier.
 *
 * Assertions are `[...]` enclosed sections which act as checks on the validity
 * of numbers but do not affect the sort order.
 *
 * @example
 *   stripCFIAssertions("/6/14[chap05ref]") // returns "/6/14"
 */
export function stripCFIAssertions(cfi: string): string {
  // Fast path for CFIs with no assertions.
  if (!cfi.includes('[')) {
    return cfi;
  }

  let result = '';

  // Has next char been escaped?
  let escaped = false;

  // Are we in a `[...]` assertion section?
  let inAssertion = false;

  for (const ch of cfi) {
    if (!escaped && ch === '^') {
      escaped = true;
      continue;
    }

    if (!escaped && ch === '[') {
      inAssertion = true;
    } else if (!escaped && inAssertion && ch === ']') {
      inAssertion = false;
    } else if (!inAssertion) {
      result += ch;
    }

    escaped = false;
  }

  return result;
}

/**
 * Compare two Canonical Fragment Identifiers.
 *
 * The full sorting rules for CFIs are specified by https://idpf.org/epub/linking/cfi/#sec-sorting.
 *
 * This function currently only implements what is necessary to compare simple
 * CFIs that specify a location within a book's spine, without any step
 * indirections ("!"). These CFIs consist of a "/"-delimited sequence of numbers,
 * with optional assertions in `[...]` brackets (eg. "/2/4[chapter2ref]").
 *
 * Per the sorting rules linked above, the input CFIs are assumed to be
 * unescaped. This means that they may contain circumflex (^) escape characters,
 * but don't have the additional escaping that is needed when CFIs are used
 * inside URIs or HTML.
 *
 * @example
 *   compareCFIs("/2/3[chap3ref]", "/2/10[chap10ref]") // returns -1
 *
 * @param a - The first CFI
 * @param b - The second CFI
 * @return A value that is negative, zero or positive depending on
 *   whether `a` is less-than, equal-to or greater-than `b`
 */
export function compareCFIs(a: string, b: string): number {
  const parseCFI = (cfi: string) => {
    return stripCFIAssertions(cfi)
      .split('/')
      .map(str => {
        const intVal = parseInt(str);
        return Number.isNaN(intVal) ? str : intVal;
      });
  };
  return compareArrays(parseCFI(a), parseCFI(b));
}
