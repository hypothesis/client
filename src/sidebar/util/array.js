/**
 * Return the number of elements in `ary` for which `predicate` returns true.
 *
 * @param {Array} ary
 * @param {Function} predicate
 */
export function countIf(ary, predicate) {
  return ary.reduce(function(count, item) {
    return predicate(item) ? count + 1 : count;
  }, 0);
}

/**
 * Convert an array to a set represented as an object.
 *
 * @param {string[]} list - List of keys for the set.
 */
export function toSet(list) {
  return list.reduce(function(set, key) {
    set[key] = true;
    return set;
  }, {});
}
