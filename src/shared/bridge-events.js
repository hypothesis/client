'use strict';

/**
 * This module defines the set of global events that are dispatched
 * across the bridge between the sidebar and annotator
 */
module.exports = {
  // Events that the sidebar sends to the annotator
  // ----------------------------------------------

  /** The set of annotations was updated. */
  PUBLIC_ANNOTATION_COUNT_CHANGED: 'publicAnnotationCountChanged',

  // Events that the annotator sends to the sidebar
  // ----------------------------------------------
};
