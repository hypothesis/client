'use strict';

var angular = require('angular');

var events = require('./events');
var retryUtil = require('./retry-util');

var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Access to the user profile and account actions. This service gives
 * other parts of the application access to the user's profile.
 *
 * In addition, this service also provides helper methods for logging in and
 * out.
 *
 * @ngInject
 */
function session($q, $rootScope, analytics, annotationUI, auth,
                 flash, raven, settings, serviceConfig, store) {
  // Cache the result of load()
  var lastLoad;
  var lastLoadTime;

  // Return the authority from the first service defined in the settings.
  // Return null if there are no services defined in the settings.
  function getAuthority() {
    var service = serviceConfig(settings);
    if (service === null) {
      return null;
    }
    return service.authority;
  }

  // Options to pass to `retry.operation` when fetching the user's profile.
  var profileFetchRetryOpts = {};

  /**
   * @name session.load()
   * @description Fetches the session data from the server.
   * @returns A promise for the session data.
   *
   * The data is cached for CACHE_TTL across all actions of the session
   * service: that is, a call to login() will update the session data and a call
   * within CACHE_TTL milliseconds to load() will return that data rather than
   * triggering a new request.
   */
  function load() {
    if (!lastLoadTime || (Date.now() - lastLoadTime) > CACHE_TTL) {

      // The load attempt is automatically retried with a backoff.
      //
      // This serves to make loading the app in the extension cope better with
      // flakey connectivity but it also throttles the frequency of calls to
      // the /app endpoint.
      lastLoadTime = Date.now();
      lastLoad = retryUtil.retryPromiseOperation(function () {
        var authority = getAuthority();
        var opts = {};
        if (authority) {
          opts.authority = authority;
        }
        return store.profile.read(opts);
      }, profileFetchRetryOpts).then(function (session) {
        update(session);
        lastLoadTime = Date.now();
        return session;
      }).catch(function (err) {
        lastLoadTime = null;
        throw err;
      });
    }
    return lastLoad;
  }

  /**
   * Store the preference server-side that the user dismissed the sidebar
   * tutorial, and then updates the session state.
   */
  function dismissSidebarTutorial() {
    return store.profile.update({}, {preferences: {show_sidebar_tutorial: false}}).then(update);
  }

  /**
   * Update the profile using the provided data.
   */
  function update(model) {
    var prevSession = annotationUI.getState().session;
    var userChanged = model.userid !== prevSession.userid;
    var groupsChanged = !angular.equals(model.groups, prevSession.groups);

    // Update the session model used by the application
    annotationUI.updateSession(model);

    lastLoad = Promise.resolve(model);
    lastLoadTime = Date.now();

    if (userChanged) {
      $rootScope.$broadcast(events.USER_CHANGED, {
        profile: model,
      });

      // associate error reports with the current user in Sentry
      if (model.userid) {
        raven.setUserInfo({
          id: model.userid,
        });
      } else {
        raven.setUserInfo(undefined);
      }
    }

    if (groupsChanged) {
      $rootScope.$broadcast(events.GROUPS_CHANGED);
    }

    // Return the model
    return model;
  }

  /**
   * Log the user out of the current session.
   */
  function logout() {
    var loggedOut = auth.logout().then(() => {
      // Re-fetch the logged-out user's profile.
      return reload();
    });

    return loggedOut.catch(function (err) {
      flash.error('Log out failed');
      analytics.track(analytics.events.LOGOUT_FAILURE);
      return $q.reject(new Error(err));
    }).then(function(){
      analytics.track(analytics.events.LOGOUT_SUCCESS);
    });
  }

  /**
   * Clear the cached profile information and re-fetch it from the server.
   *
   * This can be used to refresh the user's profile state after logging in.
   */
  function reload() {
    lastLoad = null;
    lastLoadTime = null;
    return load();
  }

  $rootScope.$on(events.OAUTH_TOKENS_CHANGED, () => {
    reload();
  });

  return {
    dismissSidebarTutorial,
    load,
    logout,
    reload,

    // Exposed for use in tests
    profileFetchRetryOpts,

    // For the moment, we continue to expose the session state as a property on
    // this service. In future, other services which access the session state
    // will do so directly from annotationUI or via selector functions
    get state() {
      return annotationUI.getState().session;
    },

    update,
  };
}

module.exports = session;
