'use strict';

const VIA_REFERRER = /^https:\/\/(qa-)?via.hypothes.is\//;

const events = {
  ANNOTATION_CREATED: 'annotationCreated',
  ANNOTATION_DELETED: 'annotationDeleted',
  ANNOTATION_FLAGGED: 'annotationFlagged',
  ANNOTATION_SHARED: 'annotationShared',
  ANNOTATION_UPDATED: 'annotationUpdated',
  DOCUMENT_SHARED: 'documentShared',
  GROUP_LEAVE: 'groupLeave',
  GROUP_SWITCH: 'groupSwitch',
  GROUP_VIEW_ACTIVITY: 'groupViewActivity',
  HIGHLIGHT_CREATED: 'highlightCreated',
  HIGHLIGHT_UPDATED: 'highlightUpdated',
  HIGHLIGHT_DELETED: 'highlightDeleted',
  LOGIN_FAILURE: 'loginFailure',
  LOGIN_SUCCESS: 'loginSuccessful',
  LOGOUT_FAILURE: 'logoutFailure',
  LOGOUT_SUCCESS: 'logoutSuccessful',
  PAGE_NOTE_CREATED: 'pageNoteCreated',
  PAGE_NOTE_UPDATED: 'pageNoteUpdated',
  PAGE_NOTE_DELETED: 'pageNoteDeleted',
  REPLY_CREATED: 'replyCreated',
  REPLY_UPDATED: 'replyUpdated',
  REPLY_DELETED: 'replyDeleted',
  SIDEBAR_OPENED: 'sidebarOpened',
  SIGN_UP_REQUESTED: 'signUpRequested',
};

/**
 * Return a string identifying the context in which the client is being used.
 *
 * This is used as the "category" for analytics events to support comparing
 * behavior across different environments in which the client is used.
 *
 * @param {Window} win
 * @param {Object} settings - Settings rendered into sidebar HTML
 * @return {string}
 */
function clientType(win, settings = {}) {
  const validTypes = [
    'chrome-extension',
    'firefox-extension',
    'embed',
    'bookmarklet',
    'via',
  ];
  let type;

  // The preferred method for deciding what type of app is running is
  // through the setting of the appType to one of the valid types above.
  // However, we also want to capture app types where we were not given
  // the appType setting explicitly - these are the app types that were
  // added before we added the analytics logic
  if (validTypes.indexOf((settings.appType || '').toLowerCase()) > -1) {
    type = settings.appType.toLowerCase();
  } else if (win.location.protocol === 'chrome-extension:') {
    type = 'chrome-extension';
  } else if (VIA_REFERRER.test(win.document.referrer)) {
    type = 'via';
  } else {
    type = 'embed';
  }

  return type;
}

/**
 * Analytics service for tracking page views and user interactions with the
 * application.
 */
// @ngInject
function analytics($window, settings) {
  const category = clientType($window, settings);
  const noop = () => {};

  // Return the current analytics.js command queue function. This function
  // is replaced when analytics.js fully loads.
  //
  // See https://developers.google.com/analytics/devguides/collection/analyticsjs/command-queue-reference
  const commandQueue = () => $window.ga || noop;

  return {
    /**
     * Track a page view when the app initially loads or changes route.
     *
     * See https://developers.google.com/analytics/devguides/collection/analyticsjs/pages
     */
    sendPageView() {
      const queue = commandQueue();
      queue('send', 'pageview');
    },

    /**
     * Track an event using Google Analytics.
     *
     * GA events have a category, action, label and value. The category is set
     * to a string indicating the distribution method of the client (embed,
     * browser extension, proxy service etc.).
     *
     * See https://developers.google.com/analytics/devguides/collection/analyticsjs/events
     *
     * @param {string} action -
     *  The event which happened. This should be a value from the `events` enum.
     * @param [string] label
     *  A string argument to associate with the event. The meaning depends upon
     *  the event.
     * @param [number] value
     *  A numeric value to associate with the event. The meaning depends upon
     *  the event.
     */
    track(action, label, value) {
      const queue = commandQueue();
      queue('send', 'event', category, action, label, value);
    },

    events,
  };
}

analytics.events = events;

module.exports = analytics;
