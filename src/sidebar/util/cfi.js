/**
 * Compare two arrays.
 *
 * Arrays are compared as a sequence of values in priority order. If the two
 * arrays are of different length but their common indexes have the same values,
 * the shorter array is considered less than the longer one.
 *
 * This logic is similar to how eg. tuples are compared in Python.
 *
 * @param {Array<number|string>} a
 * @param {Array<number|string>} b
 * @return {number}
 */
function compareArrays(a, b) {
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
 *
 * @param {string} cfi
 */
export function stripCFIAssertions(cfi) {
  // Fast path for CFIs with no assertions.
  if (!cfi.includes('[')) {
    return cfi;
  }

  let result = '';

  // Has next char been escaped?
  let escaped = false;

  // Are we in a `[...]` assertion section?
  let inAssertion = false;

  for (let ch of cfi) {
    if (!escaped && ch === '^') {
      escaped = true;
    } else if (!escaped && ch === '[') {
      inAssertion = true;
    } else if (!escaped && inAssertion && ch === ']') {
      inAssertion = false;
    } else if (!inAssertion) {
      result += ch;
      if (escaped) {
        escaped = false;
      }
    }
  }

  return result;
}

/**
 * Compare two Canonical Fragment Identifiers.
 *
 * The full sorting rules for CFIs are specified by https://idpf.org/epub/linking/cfi/#sec-sorting.
 *
 * This function currently only implements what is necessary to compare simple
 * CFIs consisting of "/"-separated sequence of numbers, plus optional
 * assertions in `[...]` brackets.
 *
 * @example
 *   compareCFIs("/2/3[chap3ref]", "/2/10[chap10ref]") // returns -1
 *
 * @param {string} a
 * @param {string} b
 * @return {number} A value that is negative, zero or positive depending on
 *   whether `a` is less-than, equal-to or greater-than `b`
 */
export function compareCFIs(a, b) {
  /** @param {string} cfi */
  const parseCFI = cfi => {
    return stripCFIAssertions(cfi)
      .split('/')
      .map(str => {
        const intVal = parseInt(str);
        return Number.isNaN(intVal) ? str : intVal;
      });
  };
  return compareArrays(parseCFI(a), parseCFI(b));
}
