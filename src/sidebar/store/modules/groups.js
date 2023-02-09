import { createSelector } from 'reselect';

import { createStoreModule, makeAction } from '../create-store';
import { sessionModule } from './session';

/**
 * @typedef {import('../../../types/api').Group} Group
 * @typedef {import('./session').State} SessionState
 */

const initialState = {
  /**
   * When there are entries, only `groups` with `id`s included in this list
   * of will be displayed in the sidebar.
   *
   * @type {Group["id"][]|null}
   */
  filteredGroupIds: null,

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

/** @typedef {typeof initialState} State */

const reducers = {
  /**
   * @param {State} state
   * @param {{ filteredGroupIds: string[] }} action
   */
  FILTER_GROUPS(state, action) {
    if (!action.filteredGroupIds?.length) {
      return {
        filteredGroupIds: null,
      };
    }
    const filteredGroups = state.groups.filter(g =>
      action.filteredGroupIds.includes(g.id)
    );
    if (!filteredGroups.length) {
      // If there are no matches in the full set of groups for any of the
      // provided `filteredGroupIds`, don't set the filter.
      return {
        filteredGroupIds: null,
      };
    }
    // Ensure we have a focused group that is in the set of filtered groups
    let focusedGroupId = state.focusedGroupId;
    if (!focusedGroupId || !action.filteredGroupIds.includes(focusedGroupId)) {
      focusedGroupId = filteredGroups[0].id;
    }
    return {
      filteredGroupIds: action.filteredGroupIds,
      focusedGroupId,
    };
  },

  /**
   * @param {State} state
   * @param {{ id: string }} action
   */
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

  /**
   * @param {State} state
   * @param {{ groups: Group[] }} action
   */
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
      filteredGroupIds: null,
      focusedGroupId: null,
      groups: [],
    };
  },
};

function clearGroups() {
  return makeAction(reducers, 'CLEAR_GROUPS', undefined);
}

/**
 * Set filtered groups.
 *
 * @param {Group["id"][]} filteredGroupIds
 */
function filterGroups(filteredGroupIds) {
  return makeAction(reducers, 'FILTER_GROUPS', { filteredGroupIds });
}

/**
 * Set the current focused group.
 *
 * @param {string} id
 */
function focusGroup(id) {
  return makeAction(reducers, 'FOCUS_GROUP', { id });
}

/**
 * Update the set of loaded groups.
 *
 * @param {Group[]} groups
 */
function loadGroups(groups) {
  return makeAction(reducers, 'LOAD_GROUPS', { groups });
}

/**
 * Return the currently focused group.
 *
 * @param {State} state
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
 * @param {State} state
 */
function focusedGroupId(state) {
  return state.focusedGroupId;
}

/**
 * Return the list of all groups, ignoring any filter present.
 *
 * @param {State} state
 */
function allGroups(state) {
  return state.groups;
}

/**
 * Return a list of groups filtered by any values in `filteredGroupIds`
 *
 * @param {State} state
 */
function filteredGroups(state) {
  if (!state.filteredGroupIds) {
    return state.groups;
  }
  return state.groups.filter(g => state.filteredGroupIds?.includes(g.id));
}

/**
 * @param {State} state
 */
function filteredGroupIds(state) {
  return state.filteredGroupIds;
}

/**
 * Return the group with the given ID.
 *
 * @param {State} state
 * @param {string} id
 */
function getGroup(state, id) {
  return state.groups.find(g => g.id === id);
}

/**
 * Return groups the user isn't a member of that are scoped to the URI.
 */
const getFeaturedGroups = createSelector(
  /** @param {State} state */
  state => filteredGroups(state),
  groups => groups.filter(group => !group.isMember && group.isScopedToUri)
);

/**
 * Return groups that are scoped to the uri. This is used to return the groups
 * that show up in the old groups menu. This should be removed once the new groups
 * menu is permanent.
 */
const getInScopeGroups = createSelector(
  /** @param {State} state */
  state => filteredGroups(state),
  groups => groups.filter(g => g.isScopedToUri)
);

// Selectors that receive root state.

/**
 * @typedef {{ groups: State, session: SessionState }} RootState
 */

/**
 * Return groups the logged in user is a member of.
 */
const getMyGroups = createSelector(
  /** @param {RootState} rootState */
  rootState => filteredGroups(rootState.groups),
  /** @param {RootState} rootState */
  rootState => sessionModule.selectors.isLoggedIn(rootState.session),
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
  /** @param {RootState} rootState */
  rootState => filteredGroups(rootState.groups),
  /** @param {RootState} rootState */
  rootState => getMyGroups(rootState),
  /** @param {RootState} rootState */
  rootState => getFeaturedGroups(rootState.groups),
  (allGroups, myGroups, featuredGroups) => {
    return allGroups.filter(
      g => !myGroups.includes(g) && !featuredGroups.includes(g)
    );
  }
);

export const groupsModule = createStoreModule(initialState, {
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
    filteredGroups,
    filteredGroupIds,
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
