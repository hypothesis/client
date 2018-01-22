'use strict';

// `Object.assign()`-like helper. Used because this script needs to work
// in IE 10/11 without polyfills.
function assign(dest, src) {
  for (var k in src) {
    if (src.hasOwnProperty(k)) {
      dest[k] = src[k];
    }
  }
  return dest;
}

/**
 * Return a parsed `js-hypothesis-config` object from the document, or `{}`.
 *
 * Find all `<script class="js-hypothesis-config">` tags in the given document,
 * parse them as JSON, and return the parsed object.
 *
 * If there are no `js-hypothesis-config` tags in the document then return
 * `{}`.
 *
 * If there are multiple `js-hypothesis-config` tags in the document then merge
 * them into a single returned object (when multiple scripts contain the same
 * setting names, scripts further down in the document override those further
 * up).
 *
 * @param {Document|Element} document - The root element to search.
 */
function jsonConfigsFrom(document) {
  var config = {};
  var settingsElements =
    document.querySelectorAll('script.js-hypothesis-config');

  for (var i=0; i < settingsElements.length; i++) {
    var settings;
    try {
      settings = JSON.parse(settingsElements[i].textContent);
    } catch (err) {
      console.warn('Could not parse settings from js-hypothesis-config tags', err);
      settings = {};
    }
    assign(config, settings);
  }

  return config;
}

/**
 * Returns a `hypothesisConfig` object from the window, or `{}`.
 *
 * Find the `window.hypothesisConfig` object and merge the properties
 * of it onto the config parameter passed in.
 *
 * If the `config` param doesn't exist, instantiate a new object.
 *
 * If the `window.hypothesisConfig` exists as a function and returns an
 * object containing properties, add it to the return object.
 *
 * @param {HypothesisConfig} config - an existing config object.
 * @returns {HypothesisConfig} - an updated config object.
 */
function jsonConfigsFromWindow(config) {
  var config = config || {};

  if (window && typeof window.hypothesisConfig === 'function') {
    var windowConfig = window.hypothesisConfig();

    if (windowConfig) assign(config, windowConfig);
  }

  return config;
}

module.exports = {
  jsonConfigsFrom: jsonConfigsFrom,
  jsonConfigsFromWindow: jsonConfigsFromWindow
};