/**
 * Utility functions for collections: Sets, Maps, Arrays and Map-like objects
 */

/**
 * Return the number of elements in `ary` for which `predicate` returns true.
 *
 * @template T
 * @param {T[]} ary
 * @param {(item: T) => boolean} predicate
 * @return {number}
 */
export function countIf(ary, predicate) {
  return ary.reduce((count, item) => {
    return predicate(item) ? count + 1 : count;
  }, 0);
}

/**
 * Convert an array of strings into an object mapping each array entry
 * to `true`.
 *
 * @param {string[]} arr
 * @return {Record<string,true>}
 */
export function toTrueMap(arr) {
  const obj = /** @type {Record<string,true>} */ ({});
  arr.forEach(key => (obj[key] = true));
  return obj;
}

/**
 * Utility function that returns all of the properties of an object whose
 * value is `true`.
 *
 * @param {Record<string, boolean>} obj
 * @return {string[]}
 */
export function trueKeys(obj) {
  return Object.keys(obj).filter(key => obj[key] === true);
}

/**
 * Typed version of `Object.entries` for use with objects typed as
 * `Record<Key, Value>`.
 *
 * Unlike `Object.entries`, this preserves the type of the key.
 *
 * @template {string|number|symbol} Key
 * @template Value
 * @param {Record<Key, Value>} object
 */
export function entries(object) {
  return /** @type {[Key, Value][]} */ (Object.entries(object));
}
