/**
 * Polyfill for `Object.hasOwn`.
 *
 * `hasOwn(someObject, property)` should be used instead of
 * `someObject.hasOwnProperty(name)`.
 */
export function hasOwn(object: object, property: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, property);
}
