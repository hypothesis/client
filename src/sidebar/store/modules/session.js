'use strict';

const serviceConfig = require('../../service-config');
const util = require('../util');

function init(settings) {
  /**
   * Profile/session information for the active user.
   */
  const service = serviceConfig(settings) || {};
  return {
    /** Whether handlers provided in service configuration for certain events */
    configuredServiceEventHandlers: {
      onHelpRequest: service.onHelpRequestProvided,
    },
    /** A map of features that are enabled for the current user. */
    features: {},
    /** A map of preference names and values. */
    preferences: {},
    /**
     * The authenticated user ID or null if the user is not logged in.
     */
    userid: null,
  };
}

const update = {
  UPDATE_SESSION: function(state, action) {
    return {
      ...action.session,
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
 * Should the tutorial panel be auto-displayed on client launch?
 */
function isTutorialAutoDisplayed(state) {
  return (
    state.viewer.isSidebar &&
    !!state.session.preferences.show_sidebar_tutorial &&
    !state.session.configuredServiceEventHandlers.onHelpRequest
  );
}

/**
 * Does the current services configuration provide an event handler for
 * `eventName`?
 *
 * @param {string} eventName
 */
function isServiceEventConfigured(state, eventName) {
  return !!state.session.configuredServiceEventHandlers[eventName];
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
  namespace: 'session',
  update,

  actions: {
    updateSession,
  },

  selectors: {
    isFeatureEnabled,
    isLoggedIn,
    isServiceEventConfigured,
    isTutorialAutoDisplayed,
    profile,
  },
};
