'use strict';

var scrollIntoView = require('scroll-into-view');

var events = require('../events');
var parseAccountID = require('../filter/persona').parseAccountID;
var scopeTimeout = require('../util/scope-timeout');
var serviceConfig = require('../service-config');
var bridgeEvents = require('../../shared/bridge-events');

function authStateFromUserID(userid) {
  if (userid) {
    var parsed = parseAccountID(userid);
    return {
      status: 'logged-in',
      userid: userid,
      username: parsed.username,
      provider: parsed.provider,
    };
  } else {
    return {status: 'logged-out'};
  }
}

// @ngInject
function HypothesisAppController(
  $document, $location, $rootScope, $route, $scope,
  $window, analytics, annotationUI, auth, bridge, drafts, features, frameSync, groups,
  serviceUrl, session, settings, streamer
) {
  var self = this;

  // This stores information about the current user's authentication status.
  // When the controller instantiates we do not yet know if the user is
  // logged-in or not, so it has an initial status of 'unknown'. This can be
  // used by templates to show an intermediate or loading state.
  this.auth = {status: 'unknown'};

  // App dialogs
  this.accountDialog = {visible: false};
  this.shareDialog = {visible: false};
  this.helpPanel = {visible: false};

  // Check to see if we're in the sidebar, or on a standalone page such as
  // the stream page or an individual annotation page.
  this.isSidebar = $window.top !== $window;
  if (this.isSidebar) {
    frameSync.connect();
  }

  this.serviceUrl = serviceUrl;

  this.sortKey = function () {
    return annotationUI.getState().sortKey;
  };

  this.sortKeysAvailable = function () {
    return annotationUI.getState().sortKeysAvailable;
  };

  this.setSortKey = annotationUI.setSortKey;

  // Reload the view when the user switches accounts
  $scope.$on(events.USER_CHANGED, function (event, data) {
    self.auth = authStateFromUserID(data.userid);
    self.accountDialog.visible = false;

    if (!data || !data.initialLoad) {
      $route.reload();
    }
  });

  session.load().then(function (state) {
    // When the authentication status of the user is known,
    // update the auth info in the top bar and show the login form
    // after first install of the extension.
    self.auth = authStateFromUserID(state.userid);

    if (!state.userid && settings.openLoginForm) {
      self.login();
    }
  });

  /** Scroll to the view to the element matching the given selector */
  function scrollToView(selector) {
    // Add a timeout so that if the element has just been shown (eg. via ngIf)
    // it is added to the DOM before we try to locate and scroll to it.
    scopeTimeout($scope, function () {
      scrollIntoView($document[0].querySelector(selector));
    }, 0);
  }

  // Start the login flow. This will present the user with the login dialog.
  this.login = function () {
    if (serviceConfig(settings)) {
      bridge.call(bridgeEvents.DO_LOGIN);
      return;
    }

    self.accountDialog.visible = true;
    scrollToView('login-form');
  };

  this.signUp = function(){
    analytics.track(analytics.events.SIGN_UP_REQUESTED);
  };

  // Display the dialog for sharing the current page
  this.share = function () {
    this.shareDialog.visible = true;
    scrollToView('share-dialog');
  };

  // Prompt to discard any unsaved drafts.
  var promptToLogout = function () {
    // TODO - Replace this with a UI which doesn't look terrible.
    var text = '';
    if (drafts.count() === 1) {
      text = 'You have an unsaved annotation.\n' +
        'Do you really want to discard this draft?';
    } else if (drafts.count() > 1) {
      text = 'You have ' + drafts.count() + ' unsaved annotations.\n' +
        'Do you really want to discard these drafts?';
    }
    return (drafts.count() === 0 || $window.confirm(text));
  };

  // Log the user out.
  this.logout = function () {
    if (!promptToLogout()) {
      return;
    }
    drafts.unsaved().forEach(function (draft) {
      $rootScope.$emit(events.ANNOTATION_DELETED, draft);
    });
    drafts.discard();
    this.accountDialog.visible = false;
    session.logout();
  };

  this.search = {
    query: function () {
      return annotationUI.getState().filterQuery;
    },
    update: function (query) {
      annotationUI.setFilterQuery(query);
    },
  };

  this.countPendingUpdates = streamer.countPendingUpdates;
  this.applyPendingUpdates = streamer.applyPendingUpdates;
}

module.exports = {
  controller: HypothesisAppController,
  controllerAs: 'vm',
  template: require('../templates/hypothesis_app.html'),
};
