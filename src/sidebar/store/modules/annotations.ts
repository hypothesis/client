/**
 * State management for the set of annotations currently loaded into the
 * sidebar.
 */
import type { Dispatch } from 'redux';
import { createSelector } from 'reselect';

import { hasOwn } from '../../../shared/has-own';
import type { Annotation, SavedAnnotation } from '../../../types/api';
import type { HighlightCluster } from '../../../types/shared';
import * as metadata from '../../helpers/annotation-metadata';
import { isHighlight, isSaved } from '../../helpers/annotation-metadata';
import { countIf, toTrueMap, trueKeys } from '../../util/collections';
import { createStoreModule, makeAction } from '../create-store';
import { routeModule } from './route';
import type { State as RouteState } from './route';
import { sessionModule } from './session';
import type { State as SessionState } from './session';

type AnchorStatus = 'anchored' | 'orphan' | 'timeout';

type AnchorStatusUpdates = {
  [$tag: string]: AnchorStatus;
};

type AnnotationStub = {
  /**
   * Service-provided identifier if annotation has been
   * persisted to the service
   */
  id?: string;

  /** Local-generated identifier */
  $tag?: string;
};

const initialState = {
  annotations: [],
  highlighted: {},
  hovered: {},
  nextTag: 1,
} as {
  /** Set of currently-loaded annotations */
  annotations: Annotation[];

  /**
   * The $tags of annotations that should appear as "highlighted", e.g. the
   * target of a single-annotation view. NB: This feature is currently not
   * supported in the application UI.
   */
  highlighted: { [$tag: string]: boolean };

  /**
   * The $tags of annotations whose cards or highlights are currently hovered.
   * The styling of the highlights/cards of these annotations are adjusted to
   * show the correspondence between the two.
   */
  hovered: { [$tag: string]: boolean };

  /**
   * The local tag to assign to the next annotation that is loaded into the app
   */
  nextTag: number;
};

export type State = typeof initialState;

/**
 * Return a copy of `current` with all matching annotations in `annotations`
 * removed (matched on identifier—`id` or `$tag`)
 *
 * Annotations in `annotations` may be complete annotations or "stubs" with only
 * the `id` field set.
 */
function excludeAnnotations(
  current: Annotation[],
  annotations: AnnotationStub[]
) {
  const ids = new Set();
  const tags = new Set();
  for (const annot of annotations) {
    if (annot.id) {
      ids.add(annot.id);
    }
    if (annot.$tag) {
      tags.add(annot.$tag);
    }
  }
  return current.filter(annot => {
    const shouldRemove =
      (annot.id && ids.has(annot.id)) || (annot.$tag && tags.has(annot.$tag));
    return !shouldRemove;
  });
}

function findByID(annotations: Annotation[], id: string) {
  return annotations.find(a => a.id === id);
}

function findByTag(annotations: Annotation[], tag: string) {
  return annotations.find(a => a.$tag === tag);
}

/**
 * Merge client annotation data into the annotation object about to be added to
 * the store's collection of `annotations`.
 *
 * `annotation` may either be new (unsaved) or a persisted annotation retrieved
 * from the service.
 *
 * @param tag - The `$tag` value that should be used for this if it doesn't have
 * a `$tag` already
 * @return - API annotation data with client annotation data merged
 */
function initializeAnnotation(
  annotation: Omit<Annotation, '$anchorTimeout'>,
  tag: string,
  currentUserId: string | null
): Annotation {
  let orphan = annotation.$orphan;

  if (!annotation.id) {
    // Unsaved (new) annotations must be anchored
    orphan = false;
  }

  let $cluster: HighlightCluster = 'other-content';
  if (annotation.user === currentUserId) {
    $cluster = isHighlight(annotation) ? 'user-highlights' : 'user-annotations';
  }

  return Object.assign({}, annotation, {
    $anchorTimeout: false,
    $cluster,
    $tag: annotation.$tag || tag,
    $orphan: orphan,
  });
}

const reducers = {
  ADD_ANNOTATIONS(
    state: State,
    action: {
      annotations: Annotation[];
      currentAnnotationCount: number;
      currentUserId: string | null;
    }
  ): Partial<State> {
    const updatedIDs = new Set();
    const updatedTags = new Set();

    const added = [];
    const unchanged = [];
    const updated = [];
    let nextTag = state.nextTag;

    for (const annot of action.annotations) {
      let existing;
      if (annot.id) {
        existing = findByID(state.annotations, annot.id);
      }
      if (!existing && annot.$tag) {
        existing = findByTag(state.annotations, annot.$tag);
      }

      if (existing) {
        // Merge the updated annotation with the private fields from the local
        // annotation
        updated.push(Object.assign({}, existing, annot));
        if (annot.id) {
          updatedIDs.add(annot.id);
        }
        if (existing.$tag) {
          updatedTags.add(existing.$tag);
        }
      } else {
        added.push(
          initializeAnnotation(annot, 't' + nextTag, action.currentUserId)
        );
        ++nextTag;
      }
    }

    for (const annot of state.annotations) {
      if (!updatedIDs.has(annot.id) && !updatedTags.has(annot.$tag)) {
        unchanged.push(annot);
      }
    }

    return {
      annotations: added.concat(updated).concat(unchanged),
      nextTag,
    };
  },

  CLEAR_ANNOTATIONS(): Partial<State> {
    return { annotations: [], highlighted: {}, hovered: {} };
  },

  HOVER_ANNOTATIONS(state: State, action: { tags: string[] }): Partial<State> {
    return { hovered: toTrueMap(action.tags) };
  },

  HIDE_ANNOTATION(state: State, action: { id: string }): Partial<State> {
    const anns = state.annotations.map(ann => {
      if (ann.id !== action.id) {
        return ann;
      }
      return { ...ann, hidden: true };
    });
    return { annotations: anns };
  },

  HIGHLIGHT_ANNOTATIONS(
    state: State,
    action: Pick<State, 'highlighted'>
  ): Partial<State> {
    return { highlighted: action.highlighted };
  },

  REMOVE_ANNOTATIONS(
    state: State,
    action: {
      annotationsToRemove: AnnotationStub[];
      remainingAnnotations: Annotation[];
    }
  ): Partial<State> {
    return {
      annotations: [...action.remainingAnnotations],
    };
  },

  UNHIDE_ANNOTATION(state: State, action: { id: string }): Partial<State> {
    const anns = state.annotations.map(ann => {
      if (ann.id !== action.id) {
        return ann;
      }
      return Object.assign({}, ann, { hidden: false });
    });
    return { annotations: anns };
  },

  UPDATE_ANCHOR_STATUS(
    state: State,
    action: { statusUpdates: AnchorStatusUpdates }
  ): Partial<State> {
    const annotations = state.annotations.map(annot => {
      if (!hasOwn(action.statusUpdates, annot.$tag)) {
        return annot;
      }

      const state = action.statusUpdates[annot.$tag];
      if (state === 'timeout') {
        return Object.assign({}, annot, { $anchorTimeout: true });
      } else {
        return Object.assign({}, annot, { $orphan: state === 'orphan' });
      }
    });
    return { annotations };
  },

  UPDATE_FLAG_STATUS(
    state: State,
    action: { id: string; isFlagged: boolean }
  ): Partial<State> {
    const annotations = state.annotations.map(annot => {
      const match = annot.id && annot.id === action.id;
      if (match) {
        if (annot.flagged === action.isFlagged) {
          return annot;
        }

        const newAnn = Object.assign({}, annot, {
          flagged: action.isFlagged,
        });
        if (newAnn.moderation) {
          const countDelta = action.isFlagged ? 1 : -1;
          newAnn.moderation = {
            ...newAnn.moderation,
            flagCount: newAnn.moderation.flagCount + countDelta,
          };
        }
        return newAnn;
      } else {
        return annot;
      }
    });
    return { annotations };
  },
};

/* Action creators */

/**
 * Add these `annotations` to the current collection of annotations in the
 * store.
 */
function addAnnotations(annotations: Annotation[]) {
  return function (
    dispatch: Dispatch,
    getState: () => {
      annotations: State;
      route: RouteState;
      session: SessionState;
    }
  ) {
    const added = annotations.filter(annot => {
      return (
        !annot.id || !findByID(getState().annotations.annotations, annot.id)
      );
    });

    const profile = sessionModule.selectors.profile(getState().session);

    dispatch(
      makeAction(reducers, 'ADD_ANNOTATIONS', {
        annotations,
        currentAnnotationCount: getState().annotations.annotations.length,
        currentUserId: profile.userid,
      })
    );

    // If we're not in the sidebar, we're done here.
    // FIXME Split the annotation-adding from the anchoring code; possibly
    // move into service
    if (routeModule.selectors.route(getState().route) !== 'sidebar') {
      return;
    }

    // If anchoring fails to complete in a reasonable amount of time, then
    // we assume that the annotation failed to anchor. If it does later
    // successfully anchor then the status will be updated.
    const ANCHORING_TIMEOUT = 500;

    const anchoringIds = added
      .filter(metadata.isWaitingToAnchor)
      .map(ann => ann.id);

    if (anchoringIds.length > 0) {
      setTimeout(() => {
        // Find annotations which haven't yet been anchored in the document.
        const anns = getState().annotations.annotations;
        const annsStillAnchoring = anchoringIds
          .map(id => (id ? findByID(anns, id) : null))
          .filter(ann => ann && metadata.isWaitingToAnchor(ann));

        // Mark anchoring as timed-out for these annotations.
        const anchorStatusUpdates = annsStillAnchoring.reduce(
          (updates, ann) => {
            updates[ann!.$tag] = 'timeout';
            return updates;
          },
          {} as AnchorStatusUpdates
        );
        dispatch(updateAnchorStatus(anchorStatusUpdates));
      }, ANCHORING_TIMEOUT);
    }
  };
}

/** Set the currently displayed annotations to the empty set. */
function clearAnnotations() {
  return makeAction(reducers, 'CLEAR_ANNOTATIONS', undefined);
}

/**
 * Replace the current set of hovered annotations with the annotations
 * identified by `tags`.
 */
function hoverAnnotations(tags: string[]) {
  return makeAction(reducers, 'HOVER_ANNOTATIONS', { tags });
}

/**
 * Update the local hidden state of an annotation.
 *
 * This updates an annotation to reflect the fact that it has been hidden from
 * non-moderators.
 */
function hideAnnotation(id: string) {
  return makeAction(reducers, 'HIDE_ANNOTATION', { id });
}

/**
 * Highlight annotations with the given `ids`.
 *
 * This is used to indicate the specific annotation in a thread that was
 * linked to for example. Replaces the current map of highlighted annotations.
 * All provided annotations (`ids`) will be set to `true` in the `highlighted`
 * map.
 */
function highlightAnnotations(ids: string[]) {
  return makeAction(reducers, 'HIGHLIGHT_ANNOTATIONS', {
    highlighted: toTrueMap(ids),
  });
}

/**
 * Remove annotations from the currently displayed set.
 *
 * @param annotations - Annotations to remove. These may be complete annotations
 *   or stubs which only contain an `id` property.
 */
export function removeAnnotations(annotations: AnnotationStub[]) {
  return (dispatch: Dispatch, getState: () => { annotations: State }) => {
    const remainingAnnotations = excludeAnnotations(
      getState().annotations.annotations,
      annotations
    );
    dispatch(
      makeAction(reducers, 'REMOVE_ANNOTATIONS', {
        annotationsToRemove: annotations,
        remainingAnnotations,
      })
    );
  };
}

/**
 * Update the local hidden state of an annotation.
 *
 * This updates an annotation to reflect the fact that it has been made visible
 * to non-moderators.
 */
function unhideAnnotation(id: string) {
  return makeAction(reducers, 'UNHIDE_ANNOTATION', { id });
}

/**
 * Update the anchoring status of an annotation
 */
function updateAnchorStatus(statusUpdates: AnchorStatusUpdates) {
  return makeAction(reducers, 'UPDATE_ANCHOR_STATUS', { statusUpdates });
}

/**
 * Updating the flagged status of an annotation.
 */
function updateFlagStatus(id: string, isFlagged: boolean) {
  return makeAction(reducers, 'UPDATE_FLAG_STATUS', { id, isFlagged });
}

/* Selectors */

/**
 * Count the number of annotations (as opposed to notes or orphans)
 */
const annotationCount = createSelector(
  (state: State) => state.annotations,
  annotations => countIf(annotations, metadata.isAnnotation)
);

function allAnnotations(state: State) {
  return state.annotations;
}

/**
 * Does the annotation indicated by `id` exist in the collection?
 */
function annotationExists(state: State, id: string) {
  return state.annotations.some(annot => annot.id === id);
}

function findAnnotationByID(state: State, id: string) {
  return findByID(state.annotations, id);
}

/**
 * Return the IDs of annotations that correspond to `tags`.
 *
 * If an annotation does not have an ID because it has not been created on
 * the server, there will be no entry for it in the returned array.
 */
function findIDsForTags(state: State, tags: string[]) {
  const ids = [];
  for (const tag of tags) {
    const annot = findByTag(state.annotations, tag);
    if (annot && annot.id) {
      ids.push(annot.id);
    }
  }
  return ids;
}

/**
 * Retrieve currently-hovered annotation identifiers
 */
const hoveredAnnotations = createSelector(
  (state: State) => state.hovered,
  hovered => trueKeys(hovered)
);

/**
 * Retrieve currently-highlighted annotation identifiers
 */
const highlightedAnnotations = createSelector(
  (state: State) => state.highlighted,
  highlighted => trueKeys(highlighted)
);

/**
 * Is the annotation identified by `$tag` currently hovered?
 */
function isAnnotationHovered(state: State, $tag: string) {
  return state.hovered[$tag] === true;
}

/**
 * Are there any annotations still waiting to anchor?
 */
const isWaitingToAnchorAnnotations = createSelector(
  (state: State) => state.annotations,
  annotations => annotations.some(metadata.isWaitingToAnchor)
);

/**
 * Return all loaded annotations that are not highlights and have not been saved
 * to the server
 */
const newAnnotations = createSelector(
  (state: State) => state.annotations,
  annotations =>
    annotations.filter(ann => metadata.isNew(ann) && !metadata.isHighlight(ann))
);

/**
 * Return all loaded annotations that are highlights and have not been saved
 * to the server
 */
const newHighlights = createSelector(
  (state: State) => state.annotations,
  annotations =>
    annotations.filter(ann => metadata.isNew(ann) && metadata.isHighlight(ann))
);

/**
 * Count the number of page notes currently in the collection
 */
const noteCount = createSelector(
  (state: State) => state.annotations,
  annotations => countIf(annotations, metadata.isPageNote)
);

/**
 * Count the number of orphans currently in the collection
 */
const orphanCount = createSelector(
  (state: State) => state.annotations,
  annotations => countIf(annotations, metadata.isOrphan)
);

/**
 * Return all loaded annotations which have been saved to the server
 */
function savedAnnotations(state: State): SavedAnnotation[] {
  return state.annotations.filter(ann => isSaved(ann)) as SavedAnnotation[];
}

export const annotationsModule = createStoreModule(initialState, {
  namespace: 'annotations',
  reducers,
  actionCreators: {
    addAnnotations,
    clearAnnotations,
    hoverAnnotations,
    hideAnnotation,
    highlightAnnotations,
    removeAnnotations,
    unhideAnnotation,
    updateAnchorStatus,
    updateFlagStatus,
  },
  selectors: {
    allAnnotations,
    annotationCount,
    annotationExists,
    findAnnotationByID,
    findIDsForTags,
    hoveredAnnotations,
    highlightedAnnotations,
    isAnnotationHovered,
    isWaitingToAnchorAnnotations,
    newAnnotations,
    newHighlights,
    noteCount,
    orphanCount,
    savedAnnotations,
  },
});
