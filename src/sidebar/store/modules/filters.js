import { createSelector } from 'reselect';

import { actionTypes } from '../util';

/**
 * @typedef FocusConfig
 * @prop {User} user
 */

/**
 * @typedef FocusedUser
 * @prop {string} filter - The identifier to use for filtering annotations
 *           derived from either a userId or a username. This may take the
 *           form of a username, e.g. 'oakbucket', or a userid
 * @prop {string} displayName
 */

/**
 * @typedef User
 * @prop {string} [userid]
 * @prop {string} [username]
 * @prop {string} displayName - User's display name
 */

/**
 * @typedef Focus
 * @prop {boolean} configured - Focus config contains valid `user` and
 *           is good to go
 * @prop {boolean} active - Focus mode is currently applied
 * @prop {FocusedUser} [user] - User to focus on (filter annotations for)
 */

/**
 * @typedef FocusState
 * @prop {boolean} active
 * @prop {boolean} configured
 * @prop {string} displayName
 */

/**
 * Configure (user-)focused mode. User-focus mode may be set in one of two
 * ways:
 * - A `focus` object containing a valid `user` object is present in the
 *   application's `settings` object during initialization time
 * - A `user` object is given to the `changeFocusedUser` action (this
 *   is implemented via an RPC method call)
 * For focus mode to be considered configured, it must have a valid `user`.
 * A successfully-configured focus mode will be set to `active` immediately
 * and may be toggled via `toggleFocusMode`.
 *
 * @param {FocusConfig} focusConfig
 * @return {Focus}
 */
function setFocus(focusConfig) {
  const focusDefaultState = {
    configured: false,
    active: false,
  };

  // To be able to apply a focused mode, a `user` object must be present,
  // and that user object must have either a `username` or a `userid`
  const focusUser = focusConfig.user || {};
  const userFilter = focusUser.username || focusUser.userid;

  // If that requirement is not met, we can't configure/activate focus mode
  if (!userFilter) {
    return focusDefaultState;
  }

  return {
    configured: true,
    active: true, // Activate valid focus mode immediately
    user: {
      filter: userFilter,
      displayName: focusUser.displayName || userFilter || '',
    },
  };
}

function init(settings) {
  return {
    filters: {},
    focus: setFocus(settings.focus || /** @type FocusConfig */ ({})),
    query: settings.query || null,
  };
}

const update = {
  CHANGE_FOCUS_MODE_USER: function (state, action) {
    return {
      focus: setFocus({ user: action.user }),
    };
  },

  SET_FILTER_QUERY: function (state, action) {
    return { query: action.query };
  },

  SET_FOCUS_MODE: function (state, action) {
    const active =
      typeof action.active !== 'undefined'
        ? action.active
        : !state.focus.active;
    return {
      focus: {
        ...state.focus,
        active,
      },
    };
  },

  // Actions defined in other modules

  CLEAR_SELECTION: function (state) {
    return {
      filters: {},
      focus: {
        ...state.focus,
        active: false,
      },
      query: null,
    };
  },
};

const actions = actionTypes(update);

// Action creators

/**
 * Clears any applied filters, changes the focused user and sets
 * focused enabled to `true`.
 *
 * @param {User} user - The user to focus on
 */
function changeFocusModeUser(user) {
  return { type: actions.CHANGE_FOCUS_MODE_USER, user };
}

/** Set the query used to filter displayed annotations. */
function setFilterQuery(query) {
  return {
    type: actions.SET_FILTER_QUERY,
    query: query,
  };
}

/**
 * Toggle whether or not a (user-)focus mode is applied, either inverting the
 * current active state or setting it to a target `active` state, if provided.
 *
 * @param {boolean} [active] - Optional `active` state for focus mode
 */
function toggleFocusMode(active) {
  return {
    type: actions.SET_FOCUS_MODE,
    active,
  };
}

// Selectors

function filterQuery(state) {
  return state.query;
}

/**
 * Summary of focus state
 *
 * @type {(state: any) => FocusState}
 */
const focusState = createSelector(
  state => state.focus,
  focus => {
    return {
      active: focus.active,
      configured: focus.configured,
      displayName: focus.configured ? focus.user.displayName : '',
    };
  }
);

/**
 * Are there currently any active (applied) filters?
 */
function hasAppliedFilter(state) {
  return !!state.query || state.focus?.active;
}

/**
 * Retrieve any applied user filter
 */
function userFilter(state) {
  return state.focus.active ? state.focus.user.filter : null;
}

/**
 * @typedef FiltersStore
 *
 * // Actions
 * @prop {typeof changeFocusModeUser} changeFocusModeUser
 * @prop {typeof setFilterQuery} setFilterQuery
 * @prop {typeof toggleFocusMode} toggleFocusMode
 *
 * // Selectors
 * @prop {() => string|null} filterQuery
 * @prop {() => FocusState} focusState
 * @prop {() => boolean} hasAppliedFilter
 * @prop {() => string|null} userFilter
 *
 */

export default {
  init,
  namespace: 'filters',
  update,
  actions: {
    changeFocusModeUser,
    setFilterQuery,
    toggleFocusMode,
  },
  selectors: {
    filterQuery,
    focusState,
    hasAppliedFilter,
    userFilter,
  },
};
