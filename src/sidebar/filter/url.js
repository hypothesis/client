/**
 * URL encode a string, dealing appropriately with null values.
 */
export function encode(str) {
  if (str) {
    return window.encodeURIComponent(str);
  }
  return '';
}
