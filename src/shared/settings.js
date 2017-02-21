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
 * Return application configuration information from the host page.
 *
 * Exposes shared application settings, read from script tags with the
 * class `js-hypothesis-config` which contain JSON content.
 *
 * If there are multiple such tags, the configuration from each is merged.
 *
 * @param {Document|Element} document - The root element to search for
 *                                      <script> settings tags.
 */
function settings(document) {
  var settingsElements =
    document.querySelectorAll('script.js-hypothesis-config');

  var config = {};
  for (var i=0; i < settingsElements.length; i++) {
    assign(config, JSON.parse(settingsElements[i].textContent));
  }
  return config;
}

module.exports = settings;
