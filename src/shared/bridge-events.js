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

  /** The sidebar is asking the annotator to do a partner site log in
   *  (for example, pop up a log in window). This is used when the client is
   *  embedded in a partner site and a log in button in the client is clicked.
   */
  LOGIN_REQUESTED: 'loginRequested',

  /** The sidebar is asking the annotator to do a partner site log out.
   *  This is used when the client is embedded in a partner site and a log out
   *  button in the client is clicked.
   */
  LOGOUT_REQUESTED: 'logoutRequested',

  /**
   * The sidebar is asking the annotator to do a partner site sign-up.
   */
  SIGNUP_REQUESTED: 'signupRequested',

  /**
   * The sidebar is asking the annotator to open the partner site profile page.
   */
  PROFILE_REQUESTED: 'profileRequested',

  // Events that the annotator sends to the sidebar
  // ----------------------------------------------
};
