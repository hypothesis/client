'use strict';

/**
 * Return a preferred initial width for the sidebar.
 *
 * Calculate a "preferred" initial width for the sidebar which will not overlap
 * the main content of the page. This assumes that the main content is text
 * contained in paragraphs. If no substantial text content can be found or there
 * simply isn't room between the right edge of the content and the right edge of
 * the window then this function will return `null`.
 *
 * @return {number|null} - Preferred width of the sidebar in px or null if
 *   no ideal width could be determined.
 */
function smartInitialWidth(options) {
  // Width in px of the "stops" for the left edge of the sidebar
  var BUCKET_WIDTH = 20;

  // Minimum length of paragraphs to consider when trying to find the main
  // content for the article.
  var MIN_PARA_LENGTH = 200;

  // Margin to leave to the left of the sidebar app iframe
  var SIDEBAR_LEFT_MARGIN = 15;

  // Find the most dominant right edge for content in the document.
  var includeP = function (el) {
    return el.textContent.length > MIN_PARA_LENGTH && el.getBoundingClientRect().right > 10;
  };

  var paras = Array.from(document.querySelectorAll('p'))
                   .filter(includeP);

  // Buckets counting the total length of content which has its right edge
  // within ranges of `BUCKET_WIDTH` pixels across the page.
  var buckets = Array(100).fill(0);

  paras.forEach(function (p) {
    var idx = Math.floor(p.getBoundingClientRect().right / BUCKET_WIDTH);
    buckets[idx] += p.textContent.length;
  });

  var maxLength = 0;
  var maxLengthIdx = -1;

  buckets.forEach(function (nChars, idx) {
    if (nChars > maxLength) {
      maxLength = nChars;
      maxLengthIdx = idx;
    }
  });

  if (maxLength < 300) {
    return null;
  }

  // Calculate the preferred width of the sidebar given the position where the
  // predominant right edge of the content is.
  var idealLeftEdge = ((maxLengthIdx * BUCKET_WIDTH) + BUCKET_WIDTH + SIDEBAR_LEFT_MARGIN);
  var defaultWidth = Math.min(options.max, window.innerWidth - idealLeftEdge);

  if (defaultWidth < options.min) {
    return null;
  }

  return defaultWidth;
}

module.exports = smartInitialWidth;
