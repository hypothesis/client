import { createSelector } from 'reselect';

import * as util from '../util';
import { createStoreModule } from '../create-store';

import session from './session';

/**
 * @typedef {import('../../../types/api').Group} Group
 * @typedef {import('./session').State} SessionState
 */

const initialState = {
  /**
   * When any entries are present, filter `groups` against this list. These are
   * set via RPC call (`changeFocusModeUser`), allowing the LMS app to filter
   * the list of groups shown in the sidebar to a subset of the entire list of
   * `groups`. When empty, ignored.
   * @type {Group["groupid"][]}
   */
  filteredGroupIDs: [],

  /**
   * List of groups
   * @type {Group[]}
   */
  groups: [],

  /**
   * ID of currently-focused group
   * @type {Group["id"]|null}
   */
  focusedGroupId: null,
};

/** @typedef {typeof initialState} State */

const reducers = {
  FILTER_GROUPS(state, action) {
    // Remove any nullish values from provided groupIDs
    const filteredGroupIDs = (action?.groupIDs ?? []).filter(
      groupid => groupid && typeof groupid === 'string'
    );

    if (!filteredGroupIDs.length) {
      return {
        filteredGroupIDs: [],
      };
    }

    const filteredGroups = state.groups.filter(g =>
      filteredGroupIDs.includes(g.groupid)
    );

    if (!filteredGroups.length) {
      console.error(
        'The list of groups to filter does not match any currently-loaded groups'
      );
      return {};
    }

    let focusedGroupId = state.focusedGroupId;
    // Get the current focused group so we can examine its `groupid`
    const focusedGroup = state.groups.find(g => g.id === state.focusedGroupId);

    if (!focusedGroupId || !filteredGroupIDs.includes(focusedGroup.groupid)) {
      // Reset focused group ID if its group is not available in filtered set
      focusedGroupId = filteredGroups[0].id;
    }
    return {
      filteredGroupIDs,
      focusedGroupId,
    };
  },

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

  CLEAR_GROUPS() {
    return {
      focusedGroupId: null,
      groups: [],
    };
  },
};

const actions = util.actionTypes(reducers);

function clearGroups() {
  return {
    type: actions.CLEAR_GROUPS,
  };
}

/**
 * Set `filteredGroupIds` to this set of `groupid`s. If `groups` is empty,
 * this will have the effect of clearing any filtered groups.
 * @param {Group["groupid"][]} [groupIDs]
 * @returns
 */
function filterGroups(groupIDs) {
  return {
    type: actions.FILTER_GROUPS,
    groupIDs,
  };
}

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
 * Return the current set of filtered `groupid`s
 * @returns {Group["groupid"][]}
 */
function filteredGroupIDs(state) {
  return state.filteredGroupIDs;
}

/**
 * Return the currently focused group.
 *
 * @return {Group|undefined|null}
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
 * Return the list of all groups. If any `filteredGroupIds` are set, the
 * list of returned `Group`s will be filtered against them.
 *
 * @return {Group[]}
 */
function allGroups(state) {
  if (state.filteredGroupIDs.length === 0) {
    return state.groups;
  }
  // All groups without a `groupid` or whose `groupid` is not in
  // `filteredGroupIds` will be filtered out when filtered groups are set
  return state.groups.filter(
    g => g.groupid && state.filteredGroupIDs.includes(g.groupid)
  );
}

/**
 * Return the group with the given ID.
 *
 * @param {string} id
 * @return {Group|undefined}
 */
function getGroup(state, id) {
  return state.groups.find(g => g.id === id);
}

/**
 * Return groups the user isn't a member of that are scoped to the URI.
 */
const getFeaturedGroups = createSelector(
  /** @param {State} state */
  state => allGroups(state),
  groups => groups.filter(group => !group.isMember && group.isScopedToUri)
);

/**
 * Return groups that are scoped to the uri. This is used to return the groups
 * that show up in the old groups menu. This should be removed once the new groups
 * menu is permanent.
 */
const getInScopeGroups = createSelector(
  /** @param {State} state */
  state => allGroups(state),
  groups => groups.filter(g => g.isScopedToUri)
);

// Selectors that receive root state.

/**
 * Return groups the logged in user is a member of.
 */
const getMyGroups = createSelector(
  /** @param {{ groups: State, session: SessionState }} rootState */
  rootState => allGroups(rootState.groups),
  rootState => session.selectors.isLoggedIn(rootState.session),
  (groups, loggedIn) => {
    // If logged out, the Public group still has isMember set to true so only
    // return groups with membership in logged in state.
    if (loggedIn) {
      return groups.filter(g => g.isMember);
    }
    return [];
  }
);

/**
 * Return groups that don't show up in Featured and My Groups.
 */
const getCurrentlyViewingGroups = createSelector(
  /** @param {{ groups: State, session: SessionState }} rootState */
  rootState => allGroups(rootState.groups),
  rootState => getMyGroups(rootState),
  rootState => getFeaturedGroups(rootState.groups),
  (allGroups, myGroups, featuredGroups) => {
    return allGroups.filter(
      g => !myGroups.includes(g) && !featuredGroups.includes(g)
    );
  }
);

export default createStoreModule(initialState, {
  namespace: 'groups',
  reducers,
  actionCreators: {
    filterGroups,
    focusGroup,
    loadGroups,
    clearGroups,
  },
  selectors: {
    allGroups,
    filteredGroupIDs,
    focusedGroup,
    focusedGroupId,
    getFeaturedGroups,
    getGroup,
    getInScopeGroups,
  },
  rootSelectors: {
    getCurrentlyViewingGroups,
    getMyGroups,
  },
});
