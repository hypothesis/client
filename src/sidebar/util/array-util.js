'use strict';

/**
 * Return the number of elements in `ary` for which `predicate` returns true.
 *
 * @param {Array} ary
 * @param {Function} predicate
 */
function countIf(ary, predicate) {
  return ary.reduce(function(count, item) {
    return predicate(item) ? count + 1 : count;
  }, 0);
}

/**
 * Create a new array with the result of calling `mapFn` on every element in
 * `ary`.
 *
 * Only truthy values are included in the resulting array.
 *
 * @param {Array} ary
 * @param {Function} mapFn
 */
function filterMap(ary, mapFn) {
  return ary.reduce(function(newArray, item) {
    const mapped = mapFn(item);
    if (mapped) {
      newArray.push(mapped);
    }
    return newArray;
  }, []);
}

/**
 * Convert an array to a set represented as an object.
 *
 * @param {string[]} list - List of keys for the set.
 */
function toSet(list) {
  return list.reduce(function(set, key) {
    set[key] = true;
    return set;
  }, {});
}

module.exports = {
  countIf: countIf,
  filterMap: filterMap,
  toSet: toSet,
};
