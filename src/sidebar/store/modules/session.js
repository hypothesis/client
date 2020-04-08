import * as util from '../util';

function init() {
  return {
    /**
     * Profile object fetched from the `/api/profile` endpoint.
     */
    profile: {
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
  UPDATE_PROFILE: function (state, action) {
    return {
      profile: { ...action.profile },
    };
  },
};

const actions = util.actionTypes(update);

/**
 * Update the profile information for the current user.
 */
function updateProfile(profile) {
  return {
    type: actions.UPDATE_PROFILE,
    profile,
  };
}

/**
 * Return true if a user is logged in and false otherwise.
 *
 * @param {object} state - The application state
 */
function isLoggedIn(state) {
  return state.session.profile.userid !== null;
}

/**
 * Return true if a given feature flag is enabled for the current user.
 *
 * @param {object} state - The application state
 * @param {string} feature - The name of the feature flag. This matches the
 *        name of the feature flag as declared in the Hypothesis service.
 */
function isFeatureEnabled(state, feature) {
  return !!state.session.profile.features[feature];
}

/**
 * Return the user's profile.
 *
 * Returns the current user's profile fetched from the `/api/profile` endpoint.
 */
function profile(state) {
  return state.session.profile;
}

export default {
  init,
  namespace: 'session',
  update,

  actions: {
    updateProfile,
  },

  selectors: {
    isFeatureEnabled,
    isLoggedIn,
    profile,
  },
};
