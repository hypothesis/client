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

  /** The sidebar is asking the annotator to do a partner site login.
   *  (for example, pop up a login window). This is used when the client is
   *  embedded in a partner site and a login button in the client is clicked.
   */
  DO_LOGIN: 'doLogin',

  // Events that the annotator sends to the sidebar
  // ----------------------------------------------
};
