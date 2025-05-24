import { createSelector } from 'reselect';

import type { Group } from '../../../types/api'; // GroupMember removed
import { createStoreModule, makeAction } from '../create-store';
// sessionModule and SessionState are no longer needed for getMyGroups simplification
// import { sessionModule } from './session';
// import type { State as SessionState } from './session';

type GroupID = Group['id'];

// FocusedGroupMembers type removed

export type State = {
  /**
   * When there are entries, only `groups` with `id`s included in this list
   * of will be displayed in the sidebar.
   */
  filteredGroupIds: GroupID[] | null;

  /** List of groups. */
  groups: Group[];
  /** ID of currently selected group. */
  focusedGroupId: string | null;

  // focusedGroupMembers property removed
};

const initialState: State = {
  filteredGroupIds: null,
  groups: [],
  focusedGroupId: null,
  // focusedGroupMembers initialization removed
};

const reducers = {
  FILTER_GROUPS(state: State, action: { filteredGroupIds: string[] }) {
    if (!action.filteredGroupIds?.length) {
      return {
        filteredGroupIds: null,
      };
    }
    const filteredGroups = state.groups.filter(g =>
      action.filteredGroupIds.includes(g.id),
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

  FOCUS_GROUP(state: State, action: { id: string }) {
    const group = state.groups.find(g => g.id === action.id);
    if (!group) {
      console.error(
        `Attempted to focus group ${action.id} which is not loaded`,
      );
      return {};
    }

    // No longer need to reset focusedGroupMembers
    return { focusedGroupId: action.id };
  },

  LOAD_GROUPS(state: State, action: { groups: Group[] }) {
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
      // focusedGroupMembers is no longer part of the state to reset here
    };
  },

  // LOAD_FOCUSED_GROUP_MEMBERS reducer removed

  CLEAR_GROUPS() {
    return {
      filteredGroupIds: null,
      focusedGroupId: null,
      groups: [],
      // focusedGroupMembers reset removed
    };
  },
};

function clearGroups() {
  return makeAction(reducers, 'CLEAR_GROUPS', undefined);
}

/**
 * Set filtered groups.
 */
function filterGroups(filteredGroupIds: GroupID[]) {
  return makeAction(reducers, 'FILTER_GROUPS', { filteredGroupIds });
}

/**
 * Set the current focused group.
 */
function focusGroup(id: string) {
  return makeAction(reducers, 'FOCUS_GROUP', { id });
}

/**
 * Update the set of loaded groups.
 */
function loadGroups(groups: Group[]) {
  return makeAction(reducers, 'LOAD_GROUPS', { groups });
}

// startLoadingFocusedGroupMembers action creator removed
// loadFocusedGroupMembers action creator removed

// getFocusedGroupMembers selector removed

/**
 * Return the currently focused group.
 */
function focusedGroup(state: State): Group | null {
  if (!state.focusedGroupId) {
    return null;
  }
  return getGroup(state, state.focusedGroupId) ?? null;
}

/**
 * Return the current focused group ID or `null`.
 */
function focusedGroupId(state: State) {
  return state.focusedGroupId;
}

/**
 * Return the list of all groups, ignoring any filter present.
 */
function allGroups(state: State) {
  return state.groups;
}

/**
 * Return a list of groups filtered by any values in `filteredGroupIds`
 */
function filteredGroups(state: State) {
  if (!state.filteredGroupIds) {
    return state.groups;
  }
  return state.groups.filter(g => state.filteredGroupIds?.includes(g.id));
}

function filteredGroupIds(state: State) {
  return state.filteredGroupIds;
}

/**
 * Return the group with the given ID.
 */
function getGroup(state: State, id: string): Group | undefined {
  return state.groups.find(g => g.id === id);
}

// getFeaturedGroups selector removed
// getInScopeGroups selector removed (assuming it's part of "Featured" or not relevant)

// Selectors that receive root state.

type RootState = {
  groups: State;
  // session: SessionState; // No longer needed for getMyGroups
};

/**
 * Return all filtered groups. In a single-user context ("Default_User"),
 * all groups are considered "my groups".
 */
const getMyGroups = createSelector(
  (rootState: RootState) => filteredGroups(rootState.groups),
  groups => {
    // "Default_User" is always logged in and owns all predefined groups.
    // The `isMember` flag on the Group itself should be true for predefined groups.
    return groups.filter(g => g.isMember);
    // Alternatively, if all groups are always the user's: return groups;
  },
);

// getCurrentlyViewingGroups selector removed

export const groupsModule = createStoreModule(initialState, {
  namespace: 'groups',
  reducers,
  actionCreators: {
    filterGroups,
    focusGroup,
    loadGroups,
    // startLoadingFocusedGroupMembers removed
    // loadFocusedGroupMembers removed
    clearGroups,
  },
  selectors: {
    allGroups,
    filteredGroups,
    filteredGroupIds,
    focusedGroup,
    focusedGroupId,
    // getFocusedGroupMembers removed
    // getFeaturedGroups removed
    getGroup,
    // getInScopeGroups removed
  },
  rootSelectors: {
    // getCurrentlyViewingGroups removed
    getMyGroups,
  },
});
