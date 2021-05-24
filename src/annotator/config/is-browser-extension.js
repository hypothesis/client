/**
 * Return true if the client is from a browser extension.
 *
 * @returns {boolean} true if this instance of the Hypothesis client is one
 *   distributed in a browser extension, false if it's one embedded in a
 *   website.
 *
 */
export function isBrowserExtension(app) {
  return !(app.startsWith('http://') || app.startsWith('https://'));
}
