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
 * Wrapper around the Google Analytics client.
 *
 * See https://developers.google.com/analytics/devguides/collection/analyticsjs/
 */
class GoogleAnalytics {
  /**
   * @param {Function} ga - The `window.ga` interface to analytics.js
   * @param {string} category - Category for events.
   */
  constructor(ga, category) {
    this.ga = ga;
    this.category = category;
  }

  /**
   * Report a user interaction to Google Analytics.
   *
   * See https://developers.google.com/analytics/devguides/collection/analyticsjs/events
   *
   * @param {string} action - The user action
   * @param {string} label
   * @param [number] value
   */
  sendEvent(action, label, value) {
    this.ga('send', 'event', this.category, action, label, value);
  }

  /**
   * Report a page view.
   *
   * This should be sent on initial page load and route changes.
   */
  sendPageView() {
    this.ga('send', 'pageview');
  }
}

/**
 * Analytics API to simplify and standardize the values that we
 * pass to the Angulartics service.
 *
 * These analytics are based on google analytics and need to conform to its
 * requirements. Specifically, we are required to send the event and a category.
 *
 * We will standardize the category to be the appType of the client settings
 */
// @ngInject
function analytics($window, settings) {
  const category = clientType($window, settings);
  const noop = () => {};
  const ga = $window.ga || noop;
  const googleAnalytics = new GoogleAnalytics(ga, category);

  return {
    sendPageView() {
      googleAnalytics.sendPageView();
    },

    /**
     * @param  {string} event This is the event name that we are capturing
     *  in our analytics. Example: 'sidebarOpened'. Use camelCase to track multiple
     *  words.
     */
    track(event, label, metricValue) {
      googleAnalytics.sendEvent(event, label, metricValue);
    },

    events,
  };
}

analytics.events = events;

module.exports = analytics;
