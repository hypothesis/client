/**
 * Ponyfills [1] for DOM element methods that are not supported in all browsers.
 *
 * [1] https://github.com/sindresorhus/ponyfill
 */

/**
 * Implementation of `element.closest(selector)`. This is used to support browsers
 * (IE 11) that don't have a native implementation.
 */
export function closest(element, selector) {
  while (element) {
    if (element.matches(selector)) {
      return element;
    }
    element = element.parentElement;
  }
  return null;
}
