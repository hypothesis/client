'use strict';

/**
 * Extracts an annotation selection or default filter from a url.
 *
 * @param {string} url - The URL which may contain a '#annotations:<ID>'
 *        fragment.
 * @return {Object} - An object with either an annotation ID or a filter string.
 */
function extractAnnotationQuery(url) {
  var filter = {};
  try {
    // Annotation IDs are url-safe-base64 identifiers
    // See https://tools.ietf.org/html/rfc4648#page-7
    var annotFragmentMatch = url.match(/#annotations:([A-Za-z0-9_-]+)$/);
    var queryFragmentMatch = url.match(/#annotations:(query|q):(.+)$/i);
    if (queryFragmentMatch) {
      filter.query = decodeURI(queryFragmentMatch[2]);
    } else if (annotFragmentMatch) {
      filter.annotations = annotFragmentMatch[1];
    } else {
      filter = null;
    }
  } catch (err) {
    // URI Error should return the page unfiltered.
    filter = null;
  }
  return filter;
}

module.exports = extractAnnotationQuery;
