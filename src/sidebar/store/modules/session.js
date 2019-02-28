'use strict';

const util = require('../util');

function init() {
  return {
    /**
     * Profile/session information for the active user.
     */
    session: {
      /** A map of features that are enabled for the current user. */
      features: {},
      /** A map of preference names and values. */
      preferences: {},
      /**
       * The authenticated user ID or null if the user is not logged in.
       */
      userid: null,
    },
  };
}

const update = {
  UPDATE_SESSION: function(state, action) {
    return {
      session: action.session,
    };
  },
};

const actions = util.actionTypes(update);

/**
 * Update the session state.
 */
function updateSession(session) {
  return {
    type: actions.UPDATE_SESSION,
    session: session,
  };
}

/**
 * Return true if a user is logged in and false otherwise.
 *
 * @param {object} state - The application state
 */
function isLoggedIn(state) {
  return state.session.userid !== null;
}

/**
 * Return true if a given feature flag is enabled.
 *
 * @param {object} state - The application state
 * @param {string} feature - The name of the feature flag. This matches the
 *        name of the feature flag as declared in the Hypothesis service.
 */
function isFeatureEnabled(state, feature) {
  return !!state.session.features[feature];
}

/**
 * Return the user's profile.
 *
 * Returns the current user's profile fetched from the `/api/profile` endpoint.
 */
function profile(state) {
  return state.session;
}

module.exports = {
  init,
  update,

  actions: {
    updateSession,
  },

  selectors: {
    isFeatureEnabled,
    isLoggedIn,
    profile,
  },
};
