import { createSelector } from 'reselect';

import type { Group, GroupMember } from '../../../types/api';
import { createStoreModule, makeAction } from '../create-store';
import { sessionModule } from './session';
import type { State as SessionState } from './session';

type GroupID = Group['id'];

/**
 * `null`: Members not yet loaded for currently focused group
 * 'loading': Members being currently loaded
 * GroupMember[]: Members already loaded
 */
type FocusedGroupMembers = null | 'loading' | GroupMember[];

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

  /** Members of currently selected group */
  focusedGroupMembers: FocusedGroupMembers;
};

const initialState: State = {
  filteredGroupIds: null,
  groups: [],
  focusedGroupId: null,
  focusedGroupMembers: null,
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

    const prevFocusedGroup = state.focusedGroupId;
    if (prevFocusedGroup === action.id) {
      return { focusedGroupId: action.id };
    }

    // Reset focused group members if focused group changed
    return { focusedGroupId: action.id, focusedGroupMembers: null };
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
    };
  },

  LOAD_FOCUSED_GROUP_MEMBERS(
    state: State,
    action: { focusedGroupMembers: FocusedGroupMembers },
  ) {
    if (!state.focusedGroupId) {
      throw new Error('A group needs to be focused before loading its members');
    }

    const { focusedGroupMembers } = action;
    return { focusedGroupMembers };
  },

  CLEAR_GROUPS() {
    return {
      filteredGroupIds: null,
      focusedGroupId: null,
      groups: [],
      focusedGroupMembers: null,
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

/**
 * Indicate lading members for focused group has started.
 */
function startLoadingFocusedGroupMembers() {
  return makeAction(reducers, 'LOAD_FOCUSED_GROUP_MEMBERS', {
    focusedGroupMembers: 'loading',
  });
}

/**
 * Update members for focused group.
 */
function loadFocusedGroupMembers(focusedGroupMembers: GroupMember[] | null) {
  return makeAction(reducers, 'LOAD_FOCUSED_GROUP_MEMBERS', {
    focusedGroupMembers,
  });
}

/**
 * Return list of members for focused group.
 * Null is returned if members are being loaded or a group is not focused.
 */
function getFocusedGroupMembers(state: State): FocusedGroupMembers {
  return state.focusedGroupMembers;
}

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

/**
 * Return groups the user isn't a member of that are scoped to the URI.
 */
const getFeaturedGroups = createSelector(
  (state: State) => filteredGroups(state),
  groups => groups.filter(group => !group.isMember && group.isScopedToUri),
);

/**
 * Return groups that are scoped to the uri. This is used to return the groups
 * that show up in the old groups menu. This should be removed once the new groups
 * menu is permanent.
 */
const getInScopeGroups = createSelector(
  (state: State) => filteredGroups(state),
  groups => groups.filter(g => g.isScopedToUri),
);

// Selectors that receive root state.

type RootState = {
  groups: State;
  session: SessionState;
};

/**
 * Return groups the logged-in user is a member of.
 */
const getMyGroups = createSelector(
  (rootState: RootState) => filteredGroups(rootState.groups),
  (rootState: RootState) =>
    sessionModule.selectors.isLoggedIn(rootState.session),
  (groups, loggedIn) => {
    // If logged out, the Public group still has isMember set to true so only
    // return groups with membership in logged in state.
    if (loggedIn) {
      return groups.filter(g => g.isMember);
    }
    return [];
  },
);

/**
 * Return groups that don't show up in Featured and My Groups.
 */
const getCurrentlyViewingGroups = createSelector(
  (rootState: RootState) => filteredGroups(rootState.groups),
  (rootState: RootState) => getMyGroups(rootState),
  (rootState: RootState) => getFeaturedGroups(rootState.groups),
  (allGroups, myGroups, featuredGroups) => {
    return allGroups.filter(
      g => !myGroups.includes(g) && !featuredGroups.includes(g),
    );
  },
);

export const groupsModule = createStoreModule(initialState, {
  namespace: 'groups',
  reducers,
  actionCreators: {
    filterGroups,
    focusGroup,
    loadGroups,
    startLoadingFocusedGroupMembers,
    loadFocusedGroupMembers,
    clearGroups,
  },
  selectors: {
    allGroups,
    filteredGroups,
    filteredGroupIds,
    focusedGroup,
    focusedGroupId,
    getFocusedGroupMembers,
    getFeaturedGroups,
    getGroup,
    getInScopeGroups,
  },
  rootSelectors: {
    getCurrentlyViewingGroups,
    getMyGroups,
  },
});
