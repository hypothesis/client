'use strict';

const util = require('../util');

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
    focusedGroup: null,
  };
}

const update = {
  FOCUS_GROUP(state, action) {
    const g = state.groups.find(g => g.id === action.id);
    return { focusedGroup: g ? action.id : null };
  },

  LOAD_GROUPS(state, action) {
    const groups = action.groups;
    let focusedGroup = state.focusedGroup;

    // Reset focused group if not in the new set of groups.
    if (state.focusedGroup === null || !groups.find(g => g.id === state.focusedGroup)) {
      if (groups.length > 0) {
        focusedGroup = groups[0].id;
      } else {
        focusedGroup = null;
      }
    }

    return {
      focusedGroup,
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
  if (!state.focusedGroup) {
    return null;
  }
  return getGroup(state, state.focusedGroup);
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
    focusedGroup,
  },
};
