'use strict';

const util = require('../util');
const { selectors: sessionSelectors } = require('./session');
const { isLoggedIn } = sessionSelectors;

function init() {
  return {
    /**
     * List of groups.
     * @type {Group[]}
     */
    groups: [],

    /**
     * ID of currently selected group.
     * @type {string|null}
     */
    focusedGroupId: null,
  };
}

const update = {
  FOCUS_GROUP(state, action) {
    const group = state.groups.find(g => g.id === action.id);
    if (!group) {
      console.error(
        `Attempted to focus group ${action.id} which is not loaded`
      );
      return {};
    }
    return { focusedGroupId: action.id };
  },

  LOAD_GROUPS(state, action) {
    const groups = action.groups;
    let focusedGroupId = state.focusedGroupId;

    // Reset focused group if not in the new set of groups.
    if (
      state.focusedGroupId === null ||
      !groups.find(g => g.id === state.focusedGroupId)
    ) {
      if (groups.length > 0) {
        focusedGroupId = groups[0].id;
      } else {
        focusedGroupId = null;
      }
    }

    return {
      focusedGroupId,
      groups: action.groups,
    };
  },
};

const actions = util.actionTypes(update);

/**
 * Set the current focused group.
 *
 * @param {string} id
 */
function focusGroup(id) {
  return {
    type: actions.FOCUS_GROUP,
    id,
  };
}

/**
 * Update the set of loaded groups.
 *
 * @param {Group[]} groups
 */
function loadGroups(groups) {
  return {
    type: actions.LOAD_GROUPS,
    groups,
  };
}

/**
 * Return the currently focused group.
 *
 * @return {Group|null}
 */
function focusedGroup(state) {
  if (!state.focusedGroupId) {
    return null;
  }
  return getGroup(state, state.focusedGroupId);
}

/**
 * Return the current focused group ID or `null`.
 *
 * @return {string|null}
 */
function focusedGroupId(state) {
  return state.focusedGroupId;
}

/**
 * Return the list of all groups.
 *
 * @return {Group[]}
 */
function allGroups(state) {
  return state.groups;
}

/**
 * Return the group with the given ID.
 *
 * @return {Group|undefined}
 */
function getGroup(state, id) {
  return state.groups.find(g => g.id === id);
}

/**
 * Return groups that don't show up in Featured and My Groups.
 *
 * @return {Group[]}
 */
function getCurrentlyViewingGroups(state) {
  const myGroups = getMyGroups(state);
  const featuredGroups = getFeaturedGroups(state);

  return state.groups.filter(
    g => !myGroups.includes(g) && !featuredGroups.includes(g)
  );
}

/**
 * Return groups the logged in user is a member of.
 *
 * @return {Group[]}
 */
function getMyGroups(state) {
  // If logged out, the Public group still has isMember set to true so only
  // return groups with membership in logged in state.
  if (isLoggedIn(state)) {
    return state.groups.filter(g => g.isMember);
  }
  return [];
}

/**
 * Return groups the user isn't a member of that are scoped to the URI.
 *
 * @return {Group[]}
 */
function getFeaturedGroups(state) {
  return state.groups.filter(group => !group.isMember && group.isScopedToUri);
}

module.exports = {
  init,
  update,
  actions: {
    focusGroup,
    loadGroups,
  },
  selectors: {
    allGroups,
    getGroup,
    getCurrentlyViewingGroups,
    getFeaturedGroups,
    getMyGroups,
    focusedGroup,
    focusedGroupId,
  },
};
