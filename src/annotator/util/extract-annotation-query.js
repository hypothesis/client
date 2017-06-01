'use strict';

/**
 * Return the `#annotations:*` ID or query from the given URL's fragment.
 *
 * If the URL contains a `#annotations:query:*` (or `#annotatons:q:*`) fragment
 * then return a `{query: *}` object containing the query extracted from the
 * fragment.
 *
 * If the URL contains a `#annotations:<ANNOTATION_ID>` fragment then return a
 * `{annotations: *}` object containing the annotation ID extracted from the
 * fragment.
 *
 * If the given URL contains neither then return `null`.
 *
 * @param {string} url - The URL to extract the ID or query from.
 * @return {Object|null} - An object containing the extracted query or ID, or null.
 */
function extractAnnotationQuery(url) {
  var annotFragmentMatch;
  var queryFragmentMatch = url.match(/#annotations:(query|q):(.+)$/i);

  if (queryFragmentMatch) {
    try {
      return {query: decodeURI(queryFragmentMatch[2])};
    } catch (err) {
      // URI Error should return the page unfiltered.
    }
  }

  // Annotation IDs are url-safe-base64 identifiers
  // See https://tools.ietf.org/html/rfc4648#page-7
  annotFragmentMatch = url.match(/#annotations:([A-Za-z0-9_-]+)$/);
  if (annotFragmentMatch) {
    return {annotations: annotFragmentMatch[1]};
  }

  return null;
}

module.exports = extractAnnotationQuery;
