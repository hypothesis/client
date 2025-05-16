/**
 * Remove Unicode marks from a string.
 *
 * This removes mark characters such as accents from a string. The string
 * must have been normalized first (eg. using {@link normalize}) to split base
 * characters and marks into separate characters. For example,
 * `removeMarks(normalize("éclair"))` returns "eclair".
 */
export function removeMarks(str: string): string {
  return str.replace(/\p{M}/gu, '');
}

/**
 * Normalize a string into Compatibility Decomposition format.
 *
 * This splits characters into parts and converts certain characters to "base"
 * versions. For example, `normalize("x²")` returns "x2".
 */
export function normalize(str: string): string {
  return str.normalize('NFKD');
}

/**
 * Truncate a string to `maxLength` code points.
 *
 * Note this is different from `str.slice(0, maxLength)` which slices UTF-16
 * code units.
 */
export function truncate(str: string, maxLength: number) {
  const chars = Array.from(str);
  if (chars.length <= maxLength) {
    return str;
  }
  return chars.slice(0, maxLength).join('');
}
