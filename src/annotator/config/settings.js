'use strict';

/**
 * Return the href URL of the first annotator link in the given document.
 *
 * Return the value of the href attribute of the first
 * `<link type="application/annotator+html">` element in the given document.
 *
 * This URL is used as the src of the sidebar's iframe.
 *
 * @param {Document} - The document to search.
 * @return {string} - The URL to use for the sidebar's iframe.
 *
 * @throws {Error} - If there's no annotator link or the first annotator has
 *   no href.
 *
 */
function app(document_) {
  var link = document_.querySelector('link[type="application/annotator+html"]');

  if (!link) {
    throw new Error('No application/annotator+html link in the document');
  }

  if (!link.href) {
    throw new Error('application/annotator+html link has no href');
  }

  return link.href;
}

/**
 * Return the `#annotations:*` ID from the given URL's fragment.
 *
 * If the URL contains a `#annotations:<ANNOTATION_ID>` fragment then return
 * the annotation ID extracted from the fragment. Otherwise return `null`.
 *
 * @param {string} url - The URL to extract the ID from.
 * @return {string|null} - The extracted ID, or null.
 */
function annotations(url) {
  // Annotation IDs are url-safe-base64 identifiers
  // See https://tools.ietf.org/html/rfc4648#page-7
  var annotFragmentMatch = url.match(/#annotations:([A-Za-z0-9_-]+)$/);
  if (annotFragmentMatch) {
    return annotFragmentMatch[1];
  }
  return null;
}

/**
 * Return the `#annotations:query:*` query from the given URL's fragment.
 *
 * If the URL contains a `#annotations:query:*` (or `#annotatons:q:*`) fragment
 * then return a the query part extracted from the fragment.
 * Otherwise return `null`.
 *
 * @param {string} url - The URL to extract the query from.
 * @return {string|null} - The extracted query, or null.
 */
function query(url) {
  var queryFragmentMatch = url.match(/#annotations:(query|q):(.+)$/i);
  if (queryFragmentMatch) {
    try {
      return decodeURI(queryFragmentMatch[2]);
    } catch (err) {
      // URI Error should return the page unfiltered.
    }
  }
  return null;
}

/**
 * Return an object containing config settings from window.hypothesisConfig().
 *
 * Return an object containing config settings returned by the
 * window.hypothesisConfig() function provided by the host page:
 *
 *   {
 *     fooSetting: 'fooValue',
 *     barSetting: 'barValue',
 *     ...
 *   }
 *
 * If there's no window.hypothesisConfig() function then return {}.
 *
 * @param {Window} window_ - The window to search for a hypothesisConfig() function
 * @return {Object} - Any config settings returned by hypothesisConfig()
 *
 */
function configFuncSettingsFrom(window_) {
  if (!window_.hasOwnProperty('hypothesisConfig')) {
    return {};
  }

  if (typeof window_.hypothesisConfig !== 'function') {
    var docs = 'https://h.readthedocs.io/projects/client/en/latest/publishers/config/#window.hypothesisConfig';
    console.warn('hypothesisConfig must be a function, see: ' + docs);
    return {};
  }

  return window_.hypothesisConfig();
}

/**
 * Return true if the client is from a browser extension.
 *
 * @returns {boolean} true if this instance of the Hypothesis client is one
 *   distributed in a browser extension, false if it's one embedded in a
 *   website.
 *
 */
function isBrowserExtension(config) {
  if (config.app.indexOf('chrome-extension://') === 0 ||
    config.app.indexOf('moz-extension://') === 0 ||
    config.app.indexOf('ms-browser-extension://') === 0) {
    return true;
  }

  return false;
}

module.exports = {
  app: app,
  annotations: annotations,
  query: query,
  configFuncSettingsFrom: configFuncSettingsFrom,
  isBrowserExtension: isBrowserExtension,
};
