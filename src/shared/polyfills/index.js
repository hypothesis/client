'use strict';

/**
 * Checkers to test which polyfills are required by the current browser.
 *
 * This module executes in an environment without any polyfills loaded so it
 * needs to run in old browsers, down to IE 11.
 *
 * See gulpfile.js for details of how to add a new polyfill.
 */

/**
 * Return true if `obj` has all of the methods in `methods`.
 */
function hasMethods(obj, ...methods) {
  return methods.every(method => typeof obj[method] === 'function');
}

/**
 * Map of polyfill set name to function to test whether the current browser
 * needs that polyfill set.
 *
 * Each checker function returns `true` if the polyfill is required or `false`
 * if the browser has the functionality natively available.
 */
const needsPolyfill = {
  es2015: () => {
    // Check for new objects in ES2015.
    if (
      typeof Promise !== 'function' ||
      typeof Map !== 'function' ||
      typeof Set !== 'function' ||
      typeof Symbol !== 'function'
    ) {
      return true;
    }

    // Check for new methods on existing objects in ES2015.
    const objMethods = [
      [Array, 'from'],
      [Array.prototype, 'fill', 'find', 'findIndex'],
      [Object, 'assign'],
      [String.prototype, 'startsWith', 'endsWith'],
    ];
    for (let [obj, ...methods] of objMethods) {
      if (!hasMethods(obj, ...methods)) {
        return true;
      }
    }

    return false;
  },

  es2016: () => {
    return !hasMethods(Array.prototype, 'includes');
  },

  es2017: () => {
    return !hasMethods(Object, 'entries', 'values');
  },

  // Test for a fully-working URL constructor.
  url: () => {
    try {
      // Some browsers do not have a URL constructor at all.
      const url = new window.URL('https://hypothes.is');

      // Other browsers have a broken URL constructor.
      if (url.hostname !== 'hypothes.is') {
        throw new Error('Broken URL constructor');
      }
      return false;
    } catch (e) {
      return true;
    }
  },

  // Test for XPath evaluation.
  'document.evaluate': () => {
    // Depending on the browser the `evaluate` property may be on the prototype
    // or just the object itself.
    return typeof document.evaluate !== 'function';
  },

  // Test for Unicode normalization. This depends on a large polyfill so it
  // is separated out into its own bundle.
  'string.prototype.normalize': () => {
    return !hasMethods(String.prototype, 'normalize');
  },

  fetch: () => {
    return typeof window.fetch !== 'function';
  },
};

/**
 * Return the subset of polyfill sets from `needed`  which are needed by the
 * current browser.
 */
function requiredPolyfillSets(needed) {
  return needed.filter(set => {
    const checker = needsPolyfill[set];
    if (!checker) {
      throw new Error(`Unknown polyfill set "${set}"`);
    }
    return checker();
  });
}

module.exports = {
  requiredPolyfillSets,
};
