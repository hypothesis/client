/**
 * This module contains state related to real-time updates received via the
 * WebSocket connection to h's real-time API.
 */
import type { Dispatch } from 'redux';
import { createSelector } from 'reselect';

import { hasOwn } from '../../../shared/has-own';
import type { Annotation } from '../../../types/api';
import { createStoreModule, makeAction } from '../create-store';
import type { State as AnnotationsState } from './annotations';
import { annotationsModule } from './annotations';
import type { State as GroupsState } from './groups';
import { groupsModule } from './groups';
import type { State as RouteState } from './route';
import { routeModule } from './route';

export type AnnotationMap = Record<string, Annotation>;
export type BooleanMap = Record<string, boolean>;

export type State = {
  /**
   * Map of ID -> updated annotation for updates that have been received over
   * the WebSocket but not yet applied (ie. saved to the "annotations" store
   * module and shown in the UI).
   */
  pendingUpdates: AnnotationMap;

  /**
   * Set of IDs of annotations which have been deleted but for which the
   * deletion has not yet been applied
   */
  pendingDeletions: BooleanMap;
};

const initialState: State = {
  pendingUpdates: {},
  pendingDeletions: {},
};

const reducers = {
  RECEIVE_REAL_TIME_UPDATES(
    state: State,
    action: { pendingUpdates: AnnotationMap; pendingDeletions: BooleanMap },
  ) {
    return {
      pendingUpdates: { ...action.pendingUpdates },
      pendingDeletions: { ...action.pendingDeletions },
    };
  },

  CLEAR_PENDING_UPDATES() {
    return { pendingUpdates: {}, pendingDeletions: {} };
  },

  ADD_ANNOTATIONS(
    state: State,
    { annotations }: { annotations: Annotation[] },
  ) {
    // Discard any pending updates which conflict with an annotation added
    // locally or fetched via an API call.
    //
    // If there is a conflicting local update/remote delete then we keep
    // the pending delete. The UI should prevent the user from editing an
    // annotation that has been deleted on the server.
    const pendingUpdates = { ...state.pendingUpdates };

    for (const ann of annotations) {
      if (ann.id) {
        delete pendingUpdates[ann.id];
      }
    }

    return { pendingUpdates };
  },

  REMOVE_ANNOTATIONS(
    state: State,
    { annotationsToRemove }: { annotationsToRemove: Annotation[] },
  ) {
    // Discard any pending updates which conflict with an annotation removed
    // locally.

    const pendingUpdates = { ...state.pendingUpdates };
    const pendingDeletions = { ...state.pendingDeletions };

    for (const ann of annotationsToRemove) {
      if (ann.id) {
        delete pendingUpdates[ann.id];
        delete pendingDeletions[ann.id];
      }
    }

    return { pendingUpdates, pendingDeletions };
  },

  FOCUS_GROUP() {
    // When switching groups we clear and re-fetch all annotations, so discard
    // any pending updates.
    return { pendingUpdates: {}, pendingDeletions: {} };
  },
};

/**
 * Record pending updates representing changes on the server that the client
 * has been notified about but has not yet applied.
 */
function receiveRealTimeUpdates({
  updatedAnnotations = [],
  deletedAnnotations = [],
}: {
  updatedAnnotations?: Annotation[];
  deletedAnnotations?: Annotation[];
}) {
  return (
    dispatch: Dispatch,
    getState: () => {
      realTimeUpdates: State;
      annotations: AnnotationsState;
      groups: GroupsState;
      route: RouteState;
    },
  ) => {
    const pendingUpdates = { ...getState().realTimeUpdates.pendingUpdates };
    const pendingDeletions = { ...getState().realTimeUpdates.pendingDeletions };

    updatedAnnotations.forEach(ann => {
      // In the sidebar, only save pending updates for annotations in the
      // focused group, since we only display annotations from the focused
      // group and reload all annotations and discard pending updates
      // when switching groups.
      const groupState = getState().groups;
      const routeState = getState().route;

      if (
        ann.group === groupsModule.selectors.focusedGroupId(groupState) ||
        routeModule.selectors.route(routeState) !== 'sidebar'
      ) {
        pendingUpdates[ann.id!] = ann;
      }
    });
    deletedAnnotations.forEach(ann => {
      const id = ann.id!;
      // Discard any pending but not-yet-applied updates for this annotation
      delete pendingUpdates[id];

      // If we already have this annotation loaded, then record a pending
      // deletion. We do not check the group of the annotation here because a)
      // that information is not included with deletion notifications and b)
      // even if the annotation is from the current group, it might be for a
      // new annotation (saved in pendingUpdates and removed above), that has
      // not yet been loaded.
      const annotationsState = getState().annotations;
      if (annotationsModule.selectors.annotationExists(annotationsState, id)) {
        pendingDeletions[id] = true;
      }
    });
    dispatch(
      makeAction(reducers, 'RECEIVE_REAL_TIME_UPDATES', {
        pendingUpdates,
        pendingDeletions,
      }),
    );
  };
}

/**
 * Clear the queue of real-time updates which have been received but not applied.
 */
function clearPendingUpdates() {
  return makeAction(reducers, 'CLEAR_PENDING_UPDATES', undefined);
}

/**
 * Return added or updated annotations received via the WebSocket
 * which have not been applied to the local state.
 */
function pendingUpdates(state: State) {
  return state.pendingUpdates;
}

/**
 * Return IDs of annotations which have been deleted on the server but not
 * yet removed from the local state.
 */
function pendingDeletions(state: State) {
  return state.pendingDeletions;
}

/**
 * Return a total count of pending updates and deletions.
 */
const pendingUpdateCount = createSelector(
  (state: State) => [state.pendingUpdates, state.pendingDeletions],
  ([pendingUpdates, pendingDeletions]) =>
    Object.keys(pendingUpdates).length + Object.keys(pendingDeletions).length,
);

/**
 * Return true if an annotation has been deleted on the server but the deletion
 * has not yet been applied.
 */
function hasPendingDeletion(state: State, id: string) {
  return hasOwn(state.pendingDeletions, id);
}

/**
 * Return true if an annotation has been created on the server, but it has not
 * yet been applied.
 */
function hasPendingUpdates(state: State): boolean {
  return Object.keys(state.pendingUpdates).length > 0;
}

export const realTimeUpdatesModule = createStoreModule(initialState, {
  namespace: 'realTimeUpdates',
  reducers,
  actionCreators: {
    receiveRealTimeUpdates,
    clearPendingUpdates,
  },
  selectors: {
    hasPendingDeletion,
    hasPendingUpdates,
    pendingDeletions,
    pendingUpdates,
    pendingUpdateCount,
  },
});
