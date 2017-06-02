'use strict';

/**
 * Return the href URL of the annotator `<link>` in the given document.
 *
 * This URL is used as the src of the sidebar's `<iframe>`.
 *
 * Return the value of the href attribute of the first
 * `<link type="application/annotator+html" href="...">` element in the given
 * document, or `null`.
 *
 * @param {Document} - The document to search.
 * @return {string|null} - The URL to use for the sidebar's iframe.
 *
 */
function iFrameSrc(document_) {
  var link = document_.querySelector('link[type="application/annotator+html"]');
  if (!link || !link.href) {
    return null;
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
 * If there is a window.hypothesisConfig but it isn't a function then throw an
 * error.
 *
 * @param {Window} window_ - The window to search for a hypothesisConfig() function
 * @return {Object} - Any config settings returned by hypothesisConfig()
 *
 * @throws {TypeError} - If window.hypothesisConfig() isn't a function
 *
 */
function configFuncSettingsFrom(window_) {
  if (!window_.hasOwnProperty('hypothesisConfig')) {
    return {};
  }

  if (typeof window_.hypothesisConfig === 'function') {
    return window_.hypothesisConfig();
  } else {
    var docs = 'https://h.readthedocs.io/en/latest/embedding.html';
    throw new TypeError('hypothesisConfig must be a function, see: ' + docs);
  }
}

module.exports = {
  iFrameSrc: iFrameSrc,
  annotations: annotations,
  query: query,
  configFuncSettingsFrom: configFuncSettingsFrom,
};
