'use strict';

/**
 * Return the `#annotations:*` ID from the given URL's fragment.
 *
 * If the URL contains a `#annotations:<ANNOTATION_ID>` fragment then return a
 * `{annotations: *}` object containing the annotation ID extracted from the
 * fragment. Otherwise return `null`.
 *
 * @param {string} url - The URL to extract the ID from.
 * @return {Object|null} - An object containing the extracted ID, or null.
 */
function annotations(url) {
  // Annotation IDs are url-safe-base64 identifiers
  // See https://tools.ietf.org/html/rfc4648#page-7
  var annotFragmentMatch = url.match(/#annotations:([A-Za-z0-9_-]+)$/);
  if (annotFragmentMatch) {
    return {annotations: annotFragmentMatch[1]};
  }
  return null;
}

/**
 * Return the `#annotations:query:*` query from the given URL's fragment.
 *
 * If the URL contains a `#annotations:query:*` (or `#annotatons:q:*`) fragment
 * then return a `{query: *}` object containing the query extracted from the
 * fragment. Otherwise return `null`.
 *
 * @param {string} url - The URL to extract the query from.
 * @return {Object|null} - An object containing the extracted query, or null.
 */
function query(url) {
  var queryFragmentMatch = url.match(/#annotations:(query|q):(.+)$/i);
  if (queryFragmentMatch) {
    try {
      return {query: decodeURI(queryFragmentMatch[2])};
    } catch (err) {
      // URI Error should return the page unfiltered.
    }
  }
  return null;
}

module.exports = {
  annotations: annotations,
  query: query,
};
