import type { SidebarSettings } from '../../../types/config';
import { createStoreModule, makeAction } from '../create-store';

export type State = {
  /**
   * The ID of the direct-linked group.
   *
   * This ID is initialized from the client's configuration to indicate that
   * the client should focus on a particular group initially. The user may
   * need to log in for this step to complete. When the user navigates away
   * from the group or clears the selection, the direct link is "consumed"
   * and no longer used.
   */
  directLinkedGroupId: string | null;

  /**
   * The ID of the direct-linked annotation.
   *
   * This ID is initialized from the client's configuration to indicate that
   * the client should focus on a particular annotation. The user may need to
   * log in to see the annotation. When the user clears the selection or
   * switches to a different group manually, the direct link is "consumed"
   * and no longer used.
   */
  directLinkedAnnotationId: string | null;

  /**
   * Indicates that an error occurred in retrieving/showing the direct linked group.
   * This could be because:
   * - the group does not exist
   * - the user does not have permission
   * - the group is out of scope for the given page
   */
  directLinkedGroupFetchFailed: boolean;
};

function initialState(settings: SidebarSettings): State {
  return {
    directLinkedGroupId: settings.group || null,
    directLinkedAnnotationId: settings.annotations || null,
    directLinkedGroupFetchFailed: false,
  };
}

const reducers = {
  UPDATE_DIRECT_LINKED_GROUP_FETCH_FAILED(
    state: State,
    action: { directLinkedGroupFetchFailed: boolean },
  ) {
    return {
      directLinkedGroupFetchFailed: action.directLinkedGroupFetchFailed,
    };
  },

  UPDATE_DIRECT_LINKED_GROUP_ID(
    state: State,
    action: { directLinkedGroupId: string },
  ) {
    return {
      directLinkedGroupId: action.directLinkedGroupId,
    };
  },

  UPDATE_DIRECT_LINKED_ANNOTATION_ID(
    state: State,
    action: { directLinkedAnnotationId: string },
  ) {
    return {
      directLinkedAnnotationId: action.directLinkedAnnotationId,
    };
  },

  CLEAR_DIRECT_LINKED_IDS() {
    return {
      directLinkedAnnotationId: null,
      directLinkedGroupId: null,
    };
  },

  CLEAR_SELECTION() {
    return {
      directLinkedAnnotationId: null,
      directLinkedGroupId: null,
      directLinkedGroupFetchFailed: false,
    };
  },
};

function setDirectLinkedGroupId(groupId: string) {
  return makeAction(reducers, 'UPDATE_DIRECT_LINKED_GROUP_ID', {
    directLinkedGroupId: groupId,
  });
}

function setDirectLinkedAnnotationId(annId: string) {
  return makeAction(reducers, 'UPDATE_DIRECT_LINKED_ANNOTATION_ID', {
    directLinkedAnnotationId: annId,
  });
}

/**
 * Set the direct linked group fetch failure to true.
 */
function setDirectLinkedGroupFetchFailed() {
  return makeAction(reducers, 'UPDATE_DIRECT_LINKED_GROUP_FETCH_FAILED', {
    directLinkedGroupFetchFailed: true,
  });
}

function clearDirectLinkedGroupFetchFailed() {
  return makeAction(reducers, 'UPDATE_DIRECT_LINKED_GROUP_FETCH_FAILED', {
    directLinkedGroupFetchFailed: false,
  });
}

/**
 * Clear the direct linked annotations and group IDs.
 *
 * This action indicates that the direct link has been "consumed" and should
 * not affect future group/annotation etc. fetches.
 */
function clearDirectLinkedIds() {
  return makeAction(reducers, 'CLEAR_DIRECT_LINKED_IDS', undefined);
}

function directLinkedAnnotationId(state: State) {
  return state.directLinkedAnnotationId;
}

function directLinkedGroupId(state: State) {
  return state.directLinkedGroupId;
}

function directLinkedGroupFetchFailed(state: State) {
  return state.directLinkedGroupFetchFailed;
}

export const directLinkedModule = createStoreModule(initialState, {
  namespace: 'directLinked',
  reducers,
  actionCreators: {
    setDirectLinkedGroupFetchFailed,
    setDirectLinkedGroupId,
    setDirectLinkedAnnotationId,
    clearDirectLinkedGroupFetchFailed,
    clearDirectLinkedIds,
  },
  selectors: {
    directLinkedAnnotationId,
    directLinkedGroupFetchFailed,
    directLinkedGroupId,
  },
});
