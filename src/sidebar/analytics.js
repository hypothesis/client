'use strict';

var VIA_REFERRER = /^https:\/\/(qa-)?via.hypothes.is\//;

var globalGAOptions = function(win, settings){

  settings = settings || {};

  var globalOpts = {
    category: '',
  };

  var validTypes = ['chrome-extension', 'firefox-extension', 'embed', 'bookmarklet', 'via'];

  // The preferred method for deciding what type of app is running is
  // through the setting of the appType to one of the valid types above.
  // However, we also want to capture app types where we were not given
  // the appType setting explicitly - these are the app types that were
  // added before we added the analytics logic
  if(validTypes.indexOf((settings.appType || '').toLowerCase()) > -1){
    globalOpts.category = settings.appType.toLowerCase();
  }else if(win.location.protocol === 'chrome-extension:'){
    globalOpts.category = 'chrome-extension';
  }else if(VIA_REFERRER.test(win.document.referrer)){
    globalOpts.category = 'via';
  }else {
    globalOpts.category = 'embed';
  }

  return globalOpts;
};

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
function analytics($analytics, $window, settings) {
  var options = $window ? globalGAOptions($window, settings) : {};

  return {

    /**
     * @param  {string} event This is the event name that we are capturing
     *  in our analytics. Example: 'sidebarOpened'. Use camelCase to track multiple
     *  words.
     */
    track: function(event, label, metricValue){
      $analytics.eventTrack(event, Object.assign({}, {
        label: label || undefined,
        metricValue: isNaN(metricValue) ? undefined : metricValue,
      }, options));
    },

    events: {
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
    },
  };
}

module.exports = analytics;
