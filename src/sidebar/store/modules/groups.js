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
    focusedGroupId,
  },
};
