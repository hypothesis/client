'use strict';

const events = require('../events');
const retryUtil = require('../util/retry');

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * @typedef Profile
 *
 * An object returned by the API (`GET /api/profile`) containing profile data
 * for the current user.
 */

/**
 * This service handles fetching the user's profile, updating profile settings
 * and logging out.
 *
 * Access to the current profile is exposed via the `state` property.
 *
 * @ngInject
 */
function session(
  $rootScope,
  analytics,
  store,
  api,
  auth,
  flash,
  raven,
  settings,
  serviceConfig
) {
  // Cache the result of load()
  let lastLoad;
  let lastLoadTime;

  // Return the authority from the first service defined in the settings.
  // Return null if there are no services defined in the settings.
  function getAuthority() {
    const service = serviceConfig(settings);
    if (service === null) {
      return null;
    }
    return service.authority;
  }

  // Options to pass to `retry.operation` when fetching the user's profile.
  const profileFetchRetryOpts = {};

  /**
   * Fetch the user's profile from the annotation service.
   *
   * If the profile has been previously fetched within `CACHE_TTL` ms, then this
   * method returns a cached profile instead of triggering another fetch.
   *
   * @return {Promise<Profile>} A promise for the user's profile data.
   */
  function load() {
    if (!lastLoadTime || Date.now() - lastLoadTime > CACHE_TTL) {
      // The load attempt is automatically retried with a backoff.
      //
      // This serves to make loading the app in the extension cope better with
      // flakey connectivity but it also throttles the frequency of calls to
      // the /app endpoint.
      lastLoadTime = Date.now();
      lastLoad = retryUtil
        .retryPromiseOperation(function() {
          const authority = getAuthority();
          const opts = {};
          if (authority) {
            opts.authority = authority;
          }
          return api.profile.read(opts);
        }, profileFetchRetryOpts)
        .then(function(session) {
          update(session);
          lastLoadTime = Date.now();
          return session;
        })
        .catch(function(err) {
          lastLoadTime = null;
          throw err;
        });
    }
    return lastLoad;
  }

  /**
   * Store the preference server-side that the user dismissed the sidebar
   * tutorial and then update the local profile data.
   */
  function dismissSidebarTutorial() {
    return api.profile
      .update({}, { preferences: { show_sidebar_tutorial: false } })
      .then(update);
  }

  /**
   * Update the local profile data.
   *
   * This method can be used to update the profile data in the client when new
   * data is pushed from the server via the real-time API.
   *
   * @param {Profile} model
   * @return {Profile} The updated profile data
   */
  function update(model) {
    const prevSession = store.getState().session;
    const userChanged = model.userid !== prevSession.userid;

    // Update the session model used by the application
    store.updateSession(model);

    lastLoad = Promise.resolve(model);
    lastLoadTime = Date.now();

    if (userChanged) {
      $rootScope.$broadcast(events.USER_CHANGED, {
        profile: model,
      });

      // Associate error reports with the current user in Sentry.
      if (model.userid) {
        raven.setUserInfo({
          id: model.userid,
        });
      } else {
        raven.setUserInfo(undefined);
      }
    }

    // Return the model
    return model;
  }

  /**
   * Log the user out of the current session.
   */
  function logout() {
    const loggedOut = auth.logout().then(() => {
      // Re-fetch the logged-out user's profile.
      return reload();
    });

    return loggedOut
      .catch(function(err) {
        flash.error('Log out failed');
        analytics.track(analytics.events.LOGOUT_FAILURE);
        throw new Error(err);
      })
      .then(function() {
        analytics.track(analytics.events.LOGOUT_SUCCESS);
      });
  }

  /**
   * Clear the cached profile information and re-fetch it from the server.
   *
   * This can be used to refresh the user's profile state after logging in.
   *
   * @return {Promise<Profile>}
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
    // will do so directly from store or via selector functions
    get state() {
      return store.getState().session;
    },

    update,
  };
}

module.exports = session;
