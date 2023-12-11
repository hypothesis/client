/**
 * Functions for working with EPUB Canonical Fragment Identifiers.
 *
 * See https://idpf.org/epub/linking/cfi/.
 */

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
  b: Array<number | string>,
): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) {
      continue;
    } else if (typeof a[i] !== typeof b[i]) {
      // The result of comparing a number with a string is undefined if the
      // string cannot be coerced to a number. To simplify things, we just
      // decide that numbers sort before strings.
      return typeof a[i] === 'number' ? -1 : 1;
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
 * CFIs that specify a location within an EPUB's Package Document, without any step
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
        // CFI step values _should_ always be integers. We currently handle
        // invalid values by using a string comparison instead. We could
        // alternatively treat all invalid CFIs as equal.
        const intVal = parseInt(str, 10);
        return Number.isNaN(intVal) ? str : intVal;
      });
  };
  return compareArrays(parseCFI(a), parseCFI(b));
}

/**
 * Return true if the CFI `cfi` lies in the range [start, end).
 */
export function cfiInRange(cfi: string, start: string, end: string): boolean {
  return compareCFIs(cfi, start) >= 0 && compareCFIs(cfi, end) < 0;
}

/**
 * Return a slice of `cfi` up to the first step indirection [1], with assertions
 * removed.
 *
 * A typical CFI consists of a path within the table of contents to indicate
 * a content document, a step indirection ("!"), then the path of an element
 * within the content document. For such a CFI, this function will retain only
 * the content document path.
 *
 * [1] https://idpf.org/epub/linking/cfi/#sec-path-indirection
 *
 * @example
 *   documentCFI('/6/152[;vnd.vst.idref=ch13_01]!/4/2[ch13_sec_1]') // Returns "/6/152"
 */
export function documentCFI(cfi: string): string {
  const stripped = stripCFIAssertions(cfi);
  const sepIndex = stripped.indexOf('!');
  return sepIndex === -1 ? stripped : stripped.slice(0, sepIndex);
}
