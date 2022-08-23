/**
 * Polyfill for `Object.hasOwn`.
 *
 * `hasOwn(someObject, property)` should be used instead of
 * `someObject.hasOwnProperty(name)`.
 *
 * @param {object} object
 * @param {string} property
 */
export function hasOwn(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}
