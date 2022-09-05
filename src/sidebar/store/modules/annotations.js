/**
 * State management for the set of annotations currently loaded into the
 * sidebar.
 */

import { createSelector } from 'reselect';

import { hasOwn } from '../../../shared/has-own';
import * as metadata from '../../helpers/annotation-metadata';
import { isSaved } from '../../helpers/annotation-metadata';
import { countIf, toTrueMap, trueKeys } from '../../util/collections';
import { createStoreModule, makeAction } from '../create-store';

import { routeModule } from './route';

/**
 * @typedef {'anchored'|'orphan'|'timeout'} AnchorStatus
 * @typedef {import('../../../types/api').Annotation} Annotation
 * @typedef {import('../../../types/api').SavedAnnotation} SavedAnnotation
 */

/**
 * @typedef AnnotationStub
 * @prop {string} [id] - service-provided identifier if annotation has been
 *       persisted to the service
 * @prop {string} [$tag] - local-generated identifier
 */

/**
 * Return a copy of `current` with all matching annotations in `annotations`
 * removed (matched on identifier—`id` or `$tag`)
 *
 * Annotations in `annotations` may be complete annotations or "stubs" with only
 * the `id` field set.
 *
 * @param {Annotation[]} current
 * @param {AnnotationStub[]} annotations
 */
function excludeAnnotations(current, annotations) {
  const ids = new Set();
  const tags = new Set();
  for (let annot of annotations) {
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

/**
 * @param {Annotation[]} annotations
 * @param {string} id
 */
function findByID(annotations, id) {
  return annotations.find(a => a.id === id);
}

/**
 * @param {Annotation[]} annotations
 * @param {string} tag
 */
function findByTag(annotations, tag) {
  return annotations.find(a => a.$tag === tag);
}

/**
 * Set custom private fields on an annotation object about to be added to the
 * store's collection of `annotations`.
 *
 * `annotation` may either be new (unsaved) or a persisted annotation retrieved
 * from the service.
 *
 * @param {Omit<Annotation, '$anchorTimeout'>} annotation
 * @param {string} tag - The `$tag` value that should be used for this
 *                       if it doesn't have a `$tag` already
 * @return {Annotation} - annotation with local (`$*`) fields set
 */
function initializeAnnotation(annotation, tag) {
  let orphan = annotation.$orphan;

  if (!annotation.id) {
    // New annotations must be anchored
    orphan = false;
  }

  return Object.assign({}, annotation, {
    // Flag indicating whether waiting for the annotation to anchor timed out.
    $anchorTimeout: false,
    $tag: annotation.$tag || tag,
    $orphan: orphan,
  });
}

const initialState = {
  /**
   * Set of all currently loaded annotations.
   *
   * @type {Annotation[]}
   */
  annotations: [],
  /**
   * Annotations whose cards or highlights are currently hovered.
   *
   * The styling of the highlights/cards of these annotations are adjusted to
   * show the correspondence between the two.
   *
   * @type {Record<string, boolean>}
   */
  hovered: {},
  /**
   * A map of annotations that should appear as "highlighted", e.g. the
   * target of a single-annotation view
   *
   * @type {Record<string, boolean>}
   */
  highlighted: {},
  /** The local tag to assign to the next annotation that is loaded into the app. */
  nextTag: 1,
};

/** @typedef {typeof initialState} State */

const reducers = {
  /**
   * @param {State} state
   * @param {{ annotations: Annotation[], currentAnnotationCount: number }} action
   */
  ADD_ANNOTATIONS(state, action) {
    const updatedIDs = new Set();
    const updatedTags = new Set();

    const added = [];
    const unchanged = [];
    const updated = [];
    let nextTag = state.nextTag;

    for (let annot of action.annotations) {
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
        added.push(initializeAnnotation(annot, 't' + nextTag));
        ++nextTag;
      }
    }

    for (let annot of state.annotations) {
      if (!updatedIDs.has(annot.id) && !updatedTags.has(annot.$tag)) {
        unchanged.push(annot);
      }
    }

    return {
      annotations: added.concat(updated).concat(unchanged),
      nextTag,
    };
  },

  CLEAR_ANNOTATIONS() {
    return { annotations: [], highlighted: {}, hovered: {} };
  },

  /**
   * @param {State} state
   * @param {{ tags: string[] }} action
   */
  HOVER_ANNOTATIONS(state, action) {
    return { hovered: toTrueMap(action.tags) };
  },

  /**
   * @param {State} state
   * @param {{ id: string }} action
   */
  HIDE_ANNOTATION(state, action) {
    const anns = state.annotations.map(ann => {
      if (ann.id !== action.id) {
        return ann;
      }
      return { ...ann, hidden: true };
    });
    return { annotations: anns };
  },

  /**
   * @param {State} state
   * @param {{ highlighted: Record<string, boolean> }} action
   */
  HIGHLIGHT_ANNOTATIONS(state, action) {
    return { highlighted: action.highlighted };
  },

  /**
   * @param {State} state
   * @param {{ annotationsToRemove: AnnotationStub[], remainingAnnotations: Annotation[] }} action
   */
  REMOVE_ANNOTATIONS(state, action) {
    return {
      annotations: [...action.remainingAnnotations],
    };
  },

  /**
   * @param {State} state
   * @param {{ id: string }} action
   */
  UNHIDE_ANNOTATION(state, action) {
    const anns = state.annotations.map(ann => {
      if (ann.id !== action.id) {
        return ann;
      }
      return Object.assign({}, ann, { hidden: false });
    });
    return { annotations: anns };
  },

  /**
   * @param {State} state
   * @param {{ statusUpdates: Record<string, AnchorStatus> }} action
   */
  UPDATE_ANCHOR_STATUS(state, action) {
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

  /**
   * @param {State} state
   * @param {{ id: string, isFlagged: boolean }} action
   */
  UPDATE_FLAG_STATUS(state, action) {
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
 * Add these `annotations` to the current collection of annotations in the store.
 *
 * @param {Annotation[]} annotations - Array of annotation objects to add.
 */
function addAnnotations(annotations) {
  /**
   * @param {import('redux').Dispatch} dispatch
   * @param {() => { annotations: State, route: import('./route').State }} getState
   */
  return function (dispatch, getState) {
    const added = annotations.filter(annot => {
      return (
        !annot.id || !findByID(getState().annotations.annotations, annot.id)
      );
    });

    dispatch(
      makeAction(reducers, 'ADD_ANNOTATIONS', {
        annotations,
        currentAnnotationCount: getState().annotations.annotations.length,
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

    const anchoringIDs = added
      .filter(metadata.isWaitingToAnchor)
      .map(ann => ann.id);
    if (anchoringIDs.length > 0) {
      setTimeout(() => {
        // Find annotations which haven't yet been anchored in the document.
        const anns = getState().annotations.annotations;
        const annsStillAnchoring = anchoringIDs
          .map(id => (id ? findByID(anns, id) : null))
          .filter(ann => ann && metadata.isWaitingToAnchor(ann));

        // Mark anchoring as timed-out for these annotations.
        const anchorStatusUpdates = annsStillAnchoring.reduce(
          (updates, ann) => {
            updates[/** @type {Annotation} */ (ann).$tag] = 'timeout';
            return updates;
          },
          /** @type {Record<string, 'timeout'>} */ ({})
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
 *
 * @param {string[]} tags
 */
function hoverAnnotations(tags) {
  return makeAction(reducers, 'HOVER_ANNOTATIONS', { tags });
}

/**
 * Update the local hidden state of an annotation.
 *
 * This updates an annotation to reflect the fact that it has been hidden from
 * non-moderators.
 *
 * @param {string} id
 */
function hideAnnotation(id) {
  return makeAction(reducers, 'HIDE_ANNOTATION', { id });
}

/**
 * Highlight annotations with the given `ids`.
 *
 * This is used to indicate the specific annotation in a thread that was
 * linked to for example. Replaces the current map of highlighted annotations.
 * All provided annotations (`ids`) will be set to `true` in the `highlighted`
 * map.
 *
 * @param {string[]} ids - annotations to highlight
 */
function highlightAnnotations(ids) {
  return makeAction(reducers, 'HIGHLIGHT_ANNOTATIONS', {
    highlighted: toTrueMap(ids),
  });
}

/**
 * Remove annotations from the currently displayed set.
 *
 * @param {AnnotationStub[]} annotations -
 *   Annotations to remove. These may be complete annotations or stubs which
 *   only contain an `id` property.
 */
export function removeAnnotations(annotations) {
  /**
   * @param {import('redux').Dispatch} dispatch
   * @param {() => { annotations: State }} getState
   */
  return (dispatch, getState) => {
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
 *
 * @param {string} id
 */
function unhideAnnotation(id) {
  return makeAction(reducers, 'UNHIDE_ANNOTATION', { id });
}

/**
 * Update the anchoring status of an annotation
 *
 * @param {Record<string, AnchorStatus>} statusUpdates - Map of annotation tag to orphan status
 */
function updateAnchorStatus(statusUpdates) {
  return makeAction(reducers, 'UPDATE_ANCHOR_STATUS', { statusUpdates });
}

/**
 * Updating the flagged status of an annotation.
 *
 * @param {string} id - Annotation ID
 * @param {boolean} isFlagged - The flagged status of the annotation. True if
 *        the user has flagged the annotation.
 *
 */
function updateFlagStatus(id, isFlagged) {
  return makeAction(reducers, 'UPDATE_FLAG_STATUS', { id, isFlagged });
}

/* Selectors */

/**
 * Count the number of annotations (as opposed to notes or orphans)
 */
const annotationCount = createSelector(
  /** @param {State} state */
  state => state.annotations,
  annotations => countIf(annotations, metadata.isAnnotation)
);

/**
 * Retrieve all annotations currently in the store
 *
 * @param {State} state
 */
function allAnnotations(state) {
  return state.annotations;
}

/**
 * Does the annotation indicated by `id` exist in the collection?
 *
 * @param {State} state
 * @param {string} id
 */
function annotationExists(state, id) {
  return state.annotations.some(annot => annot.id === id);
}

/**
 * Return the annotation with the given ID
 *
 * @param {State} state
 * @param {string} id
 */
function findAnnotationByID(state, id) {
  return findByID(state.annotations, id);
}

/**
 * Return the IDs of annotations that correspond to `tags`.
 *
 * If an annotation does not have an ID because it has not been created on
 * the server, there will be no entry for it in the returned array.
 *
 * @param {State} state
 * @param {string[]} tags - Local tags of annotations to look up
 */
function findIDsForTags(state, tags) {
  const ids = [];
  for (let tag of tags) {
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
  /** @param {State} state */
  state => state.hovered,
  hovered => trueKeys(hovered)
);

/**
 * Retrieve currently-highlighted annotation identifiers
 */
const highlightedAnnotations = createSelector(
  /** @param {State} state */
  state => state.highlighted,
  highlighted => trueKeys(highlighted)
);

/**
 * Is the annotation identified by `$tag` currently hovered?
 *
 * @param {State} state
 * @param {string} $tag
 */
function isAnnotationHovered(state, $tag) {
  return state.hovered[$tag] === true;
}

/**
 * Are there any annotations still waiting to anchor?
 */
const isWaitingToAnchorAnnotations = createSelector(
  /** @param {State} state */
  state => state.annotations,
  annotations => annotations.some(metadata.isWaitingToAnchor)
);

/**
 * Return all loaded annotations that are not highlights and have not been saved
 * to the server
 */
const newAnnotations = createSelector(
  /** @param {State} state */
  state => state.annotations,
  annotations =>
    annotations.filter(ann => metadata.isNew(ann) && !metadata.isHighlight(ann))
);

/**
 * Return all loaded annotations that are highlights and have not been saved
 * to the server
 */
const newHighlights = createSelector(
  /** @param {State} state */
  state => state.annotations,
  annotations =>
    annotations.filter(ann => metadata.isNew(ann) && metadata.isHighlight(ann))
);

/**
 * Count the number of page notes currently in the collection
 */
const noteCount = createSelector(
  /** @param {State} state */
  state => state.annotations,
  annotations => countIf(annotations, metadata.isPageNote)
);

/**
 * Count the number of orphans currently in the collection
 */
const orphanCount = createSelector(
  /** @param {State} state */
  state => state.annotations,
  annotations => countIf(annotations, metadata.isOrphan)
);

/**
 * Return all loaded annotations which have been saved to the server
 *
 * @param {State} state
 * @return {SavedAnnotation[]}
 */
function savedAnnotations(state) {
  return /** @type {SavedAnnotation[]} */ (
    state.annotations.filter(ann => isSaved(ann))
  );
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
