'use strict';

const scrollIntoView = require('scroll-into-view');

const events = require('../events');
const { parseAccountID } = require('../util/account-id');
const scopeTimeout = require('../util/scope-timeout');
const serviceConfig = require('../service-config');
const bridgeEvents = require('../../shared/bridge-events');

/**
 * Return the user's authentication status from their profile.
 *
 * @param {Profile} profile - The profile object from the API.
 */
function authStateFromProfile(profile) {
  if (profile.userid) {
    const parsed = parseAccountID(profile.userid);
    let displayName = parsed.username;
    if (profile.user_info && profile.user_info.display_name) {
      displayName = profile.user_info.display_name;
    }
    return {
      status: 'logged-in',
      displayName,
      userid: profile.userid,
      username: parsed.username,
      provider: parsed.provider,
    };
  } else {
    return { status: 'logged-out' };
  }
}

// @ngInject
function HypothesisAppController(
  $document,
  $rootScope,
  $route,
  $scope,
  $window,
  analytics,
  store,
  auth,
  bridge,
  features,
  flash,
  frameSync,
  groups,
  serviceUrl,
  session,
  settings
) {
  const self = this;

  // This stores information about the current user's authentication status.
  // When the controller instantiates we do not yet know if the user is
  // logged-in or not, so it has an initial status of 'unknown'. This can be
  // used by templates to show an intermediate or loading state.
  this.auth = { status: 'unknown' };

  // App dialogs
  this.shareDialog = { visible: false };
  this.helpPanel = { visible: false };

  // Check to see if we're in the sidebar, or on a standalone page such as
  // the stream page or an individual annotation page.
  this.isSidebar = $window.top !== $window;
  if (this.isSidebar) {
    frameSync.connect();
  }

  // Reload the view when the user switches accounts
  $scope.$on(events.USER_CHANGED, function(event, data) {
    self.auth = authStateFromProfile(data.profile);
  });

  session.load().then(profile => {
    self.auth = authStateFromProfile(profile);
  });

  /** Scroll to the view to the element matching the given selector */
  function scrollToView(selector) {
    // Add a timeout so that if the element has just been shown (eg. via ngIf)
    // it is added to the DOM before we try to locate and scroll to it.
    scopeTimeout(
      $scope,
      function() {
        scrollIntoView($document[0].querySelector(selector));
      },
      0
    );
  }

  /**
   * Start the login flow. This will present the user with the login dialog.
   *
   * @return {Promise<void>} - A Promise that resolves when the login flow
   *   completes. For non-OAuth logins, always resolves immediately.
   */
  this.login = function() {
    if (serviceConfig(settings)) {
      // Let the host page handle the login request
      bridge.call(bridgeEvents.LOGIN_REQUESTED);
      return Promise.resolve();
    }

    return auth
      .login()
      .then(() => {
        store.clearGroups();
        session.reload();
      })
      .catch(err => {
        flash.error(err.message);
      });
  };

  this.signUp = function() {
    analytics.track(analytics.events.SIGN_UP_REQUESTED);

    if (serviceConfig(settings)) {
      // Let the host page handle the signup request
      bridge.call(bridgeEvents.SIGNUP_REQUESTED);
      return;
    }
    $window.open(serviceUrl('signup'));
  };

  // Display the dialog for sharing the current page
  this.share = function() {
    this.shareDialog.visible = true;
    scrollToView('share-dialog');
  };

  this.showHelpPanel = function() {
    const service = serviceConfig(settings) || {};
    if (service.onHelpRequestProvided) {
      // Let the host page handle the help request.
      bridge.call(bridgeEvents.HELP_REQUESTED);
      return;
    }

    this.helpPanel.visible = true;
  };

  // Prompt to discard any unsaved drafts.
  const promptToLogout = function() {
    // TODO - Replace this with a UI which doesn't look terrible.
    let text = '';
    const drafts = store.countDrafts();
    if (drafts === 1) {
      text =
        'You have an unsaved annotation.\n' +
        'Do you really want to discard this draft?';
    } else if (drafts > 1) {
      text =
        'You have ' +
        drafts +
        ' unsaved annotations.\n' +
        'Do you really want to discard these drafts?';
    }
    return drafts === 0 || $window.confirm(text);
  };

  // Log the user out.
  this.logout = function() {
    if (!promptToLogout()) {
      return;
    }

    store.clearGroups();
    store.unsavedAnnotations().forEach(function(annotation) {
      $rootScope.$emit(events.ANNOTATION_DELETED, annotation);
    });
    store.discardAllDrafts();

    if (serviceConfig(settings)) {
      // Let the host page handle the signup request
      bridge.call(bridgeEvents.LOGOUT_REQUESTED);
      return;
    }

    session.logout();
  };
}

module.exports = {
  controller: HypothesisAppController,
  controllerAs: 'vm',
  template: require('../templates/hypothesis-app.html'),
};
