'use strict';

const events = require('../shared/bridge-events');

const ANNOTATION_COUNT_ATTR = 'data-hypothesis-annotation-count';

/**
 * Update the elements in the container element with the count data attribute
 * with the new annotation count.
 *
 * @param {Element} rootEl - The DOM element which contains the elements that
 * display annotation count.
 */

function annotationCounts(rootEl, crossframe) {
  crossframe.on(
    events.PUBLIC_ANNOTATION_COUNT_CHANGED,
    updateAnnotationCountElems
  );

  function updateAnnotationCountElems(newCount) {
    const elems = rootEl.querySelectorAll('[' + ANNOTATION_COUNT_ATTR + ']');
    Array.from(elems).forEach(function(elem) {
      elem.textContent = newCount;
    });
  }
}

module.exports = annotationCounts;
