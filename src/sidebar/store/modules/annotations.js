/**
 * State management for the set of annotations currently loaded into the
 * sidebar.
 */

/**
 * @typedef {import('../../../types/api').Annotation} Annotation
 * @typedef {import('../../../types/api').SavedAnnotation} SavedAnnotation
 */

/**
 * @typedef AnnotationStub
 * @prop {string} [id] - service-provided identifier if annotation has been
 *       persisted to the service
 * @prop {string} [$tag] - local-generated identifier
 */

import { createSelector } from 'reselect';

import * as metadata from '../../helpers/annotation-metadata';
import { isSaved } from '../../helpers/annotation-metadata';
import { countIf, toTrueMap, trueKeys } from '../../util/collections';
import * as util from '../util';
import { createStoreModule } from '../create-store';

import { routeModule } from './route';

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
  const ids = {};
  const tags = {};
  annotations.forEach(annot => {
    if (annot.id) {
      ids[annot.id] = true;
    }
    if (annot.$tag) {
      tags[annot.$tag] = true;
    }
  });
  return current.filter(annot => {
    const shouldRemove =
      (annot.id && annot.id in ids) || (annot.$tag && annot.$tag in tags);
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
 * Initialize the local ("$"-prefixed) fields of an annotation.
 *
 * @param {Annotation} annotation - New (unsaved) annotation or one retrieved from
 *   the backend. This annotation may not have all local fields set.
 * @param {string} tag - The `$tag` value that should be used for this
 *                       if it doesn't have a `$tag` already
 * @param {string} frameId
 * @return {Annotation} - Annotation with all local fields set
 */
function initializeAnnotation(annotation, tag, frameId) {
  let orphan = annotation.$orphan;

  if (!annotation.id) {
    // New annotations must be anchored
    orphan = false;
  }

  return {
    ...annotation,

    $anchorTimeout: false,
    $frameId: frameId,
    $tag: annotation.$tag || tag,
    $orphan: orphan,
  };
}

const initialState = {
  /**
   * Set of all currently loaded annotations.
   *
   * @type {Annotation[]}
   */
  annotations: [],
  /**
   * A set of annotations that are currently "focused" — e.g. hovered over in
   * the UI.
   *
   * @type {Record<string, boolean>}
   */
  focused: {},
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
  /** @param {State} state */
  ADD_ANNOTATIONS(state, action) {
    const updatedIDs = {};
    const updatedTags = {};

    const added = [];
    const unchanged = [];
    const updated = [];
    let nextTag = state.nextTag;

    action.annotations.forEach(annot => {
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
          updatedIDs[annot.id] = true;
        }
        if (existing.$tag) {
          updatedTags[existing.$tag] = true;
        }
      } else {
        added.push(initializeAnnotation(annot, 't' + nextTag, action.frameId));
        ++nextTag;
      }
    });

    state.annotations.forEach(annot => {
      if (!updatedIDs[annot.id] && !updatedTags[annot.$tag]) {
        unchanged.push(annot);
      }
    });

    return {
      annotations: added.concat(updated).concat(unchanged),
      nextTag,
    };
  },

  CLEAR_ANNOTATIONS() {
    return { annotations: [], focused: {}, highlighted: {} };
  },

  /** @param {State} state */
  FOCUS_ANNOTATIONS(state, action) {
    return { focused: toTrueMap(action.focusedTags) };
  },

  /** @param {State} state */
  HIDE_ANNOTATION(state, action) {
    const anns = state.annotations.map(ann => {
      if (ann.id !== action.id) {
        return ann;
      }
      return { ...ann, hidden: true };
    });
    return { annotations: anns };
  },

  /** @param {State} state */
  HIGHLIGHT_ANNOTATIONS(state, action) {
    return { highlighted: action.highlighted };
  },

  /** @param {State} state */
  REMOVE_ANNOTATIONS(state, action) {
    return {
      annotations: [...action.remainingAnnotations],
    };
  },

  /** @param {State} state */
  UNHIDE_ANNOTATION(state, action) {
    const anns = state.annotations.map(ann => {
      if (ann.id !== action.id) {
        return ann;
      }
      return Object.assign({}, ann, { hidden: false });
    });
    return { annotations: anns };
  },

  /** @param {State} state */
  UPDATE_ANCHOR_STATUS(state, action) {
    const annotations = state.annotations.map(annot => {
      if (!action.statusUpdates.hasOwnProperty(annot.$tag)) {
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

  /** @param {State} state */
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

const actions = util.actionTypes(reducers);

/* Action creators */

/**
 * Add these `annotations` to the current collection of annotations in the store.
 *
 * @param {string|null} frameId
 * @param {Annotation[]} annotations - Array of annotation objects to add.
 */
function addAnnotations(frameId, annotations) {
  return function (dispatch, getState) {
    const added = annotations.filter(annot => {
      return (
        !annot.id || !findByID(getState().annotations.annotations, annot.id)
      );
    });

    dispatch({
      type: actions.ADD_ANNOTATIONS,
      frameId,
      annotations,
      currentAnnotationCount: getState().annotations.annotations.length,
    });

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
  return { type: actions.CLEAR_ANNOTATIONS };
}

/**
 * Replace the current set of focused annotations with the annotations
 * identified by `tags`. All provided annotations (`tags`) will be set to
 * `true` in the `focused` map.
 *
 * @param {string[]} tags - Identifiers of annotations to focus
 */
function focusAnnotations(tags) {
  return {
    type: actions.FOCUS_ANNOTATIONS,
    focusedTags: tags,
  };
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
  return {
    type: actions.HIDE_ANNOTATION,
    id,
  };
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
  return {
    type: actions.HIGHLIGHT_ANNOTATIONS,
    highlighted: toTrueMap(ids),
  };
}

/**
 * Remove annotations from the currently displayed set.
 *
 * @param {AnnotationStub[]} annotations -
 *   Annotations to remove. These may be complete annotations or stubs which
 *   only contain an `id` property.
 */
export function removeAnnotations(annotations) {
  return (dispatch, getState) => {
    const remainingAnnotations = excludeAnnotations(
      getState().annotations.annotations,
      annotations
    );
    dispatch({
      type: actions.REMOVE_ANNOTATIONS,
      annotationsToRemove: annotations,
      remainingAnnotations,
    });
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
  return {
    type: actions.UNHIDE_ANNOTATION,
    id,
  };
}

/**
 * Update the anchoring status of an annotation
 *
 * @param {{ [tag: string]: 'anchored'|'orphan'|'timeout'} } statusUpdates - A
 *        map of annotation tag to orphan status
 */
function updateAnchorStatus(statusUpdates) {
  return {
    type: actions.UPDATE_ANCHOR_STATUS,
    statusUpdates,
  };
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
  return {
    type: actions.UPDATE_FLAG_STATUS,
    id,
    isFlagged,
  };
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
  tags.forEach(tag => {
    const annot = findByTag(state.annotations, tag);
    if (annot && annot.id) {
      ids.push(annot.id);
    }
  });
  return ids;
}

/**
 * Retrieve currently-focused annotation identifiers
 */
const focusedAnnotations = createSelector(
  /** @param {State} state */
  state => state.focused,
  focused => trueKeys(focused)
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
 * Is the annotation referenced by `$tag` currently focused?
 *
 * @param {State} state
 * @param {string} $tag
 */
function isAnnotationFocused(state, $tag) {
  return state.focused[$tag] === true;
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
    focusAnnotations,
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
    focusedAnnotations,
    highlightedAnnotations,
    isAnnotationFocused,
    isWaitingToAnchorAnnotations,
    newAnnotations,
    newHighlights,
    noteCount,
    orphanCount,
    savedAnnotations,
  },
});
