/**
 * Run a series of representative feature tests to see if the browser is new
 * enough to support Hypothesis.
 *
 * We use feature tests to try to avoid false negatives, accepting some risk of
 * false positives due to the host page having loaded polyfills for APIs in order
 * to support older browsers.
 *
 * @return {boolean}
 */
export function isBrowserSupported() {
  // Checks that return a truthy value if they succeed and throw or return
  // a falsey value if they fail.
  const checks = [
    // ES APIs.
    () => Promise.resolve(),
    () => new Map(),

    // DOM API checks for frequently-used APIs.
    () => new URL(document.location.href), // URL constructor.
    () => new Request('https://hypothes.is'), // Part of the `fetch` API.
    () => Element.prototype.attachShadow,

    // CSS feature checks
    () => CSS.supports('display: grid'),

    // DOM API checks for less frequently-used APIs.
    // These are less likely to have been polyfilled by the host page.
    () => {
      document.evaluate(
        '/html/body',
        document,

        // These arguments are optional in the spec but required in Edge Legacy.
        null /* namespaceResolver */,
        XPathResult.ANY_TYPE,
        null /* result */
      );
      return true;
    },
  ];

  try {
    return checks.every(check => check());
  } catch (err) {
    return false;
  }
}
