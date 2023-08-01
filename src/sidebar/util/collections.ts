/**
 * Utility functions for collections: Sets, Maps, Arrays and Map-like objects
 */

/**
 * Return the number of elements in `ary` for which `predicate` returns true.
 */
export function countIf<T>(ary: T[], predicate: (item: T) => boolean): number {
  return ary.reduce((count, item) => {
    return predicate(item) ? count + 1 : count;
  }, 0);
}

/**
 * Convert an array of strings into an object mapping each array entry
 * to `true`.
 */
export function toTrueMap(arr: string[]): Record<string, true> {
  const obj: Record<string, true> = {};
  arr.forEach(key => (obj[key] = true));
  return obj;
}

/**
 * Utility function that returns all the properties of an object whose
 * value is `true`.
 */
export function trueKeys(obj: Record<string, boolean>): string[] {
  return Object.keys(obj).filter(key => obj[key] === true);
}

/**
 * Typed version of `Object.entries` for use with objects typed as
 * `Record<Key, Value>`.
 *
 * Unlike `Object.entries`, this preserves the type of the key.
 */
export function entries<Key extends string | number | symbol, Value>(
  object: Record<Key, Value>,
): [Key, Value][] {
  return Object.entries(object) as [Key, Value][];
}
