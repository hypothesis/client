/**
 * Returns true if this instance of the Hypothesis client is one distributed in
 * a browser extension, false if it's one embedded in a website.
 */
export function isBrowserExtension(url: string): boolean {
  return !(url.startsWith('http://') || url.startsWith('https://'));
}
