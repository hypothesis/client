/**
 * State management for the set of annotations currently loaded into the
 * sidebar.
 */

import { createSelector } from 'reselect';

import * as metadata from '../../util/annotation-metadata';
import * as arrayUtil from '../../util/array';
import * as util from '../util';

import route from './route';

/**
 * Return a copy of `current` with all matching annotations in `annotations`
 * removed.
 *
 * Annotations in `annotations` may be complete annotations or "stubs" with only
 * the `id` field set.
 */
function excludeAnnotations(current, annotations) {
  const ids = {};
  const tags = {};
  annotations.forEach(function(annot) {
    if (annot.id) {
      ids[annot.id] = true;
    }
    if (annot.$tag) {
      tags[annot.$tag] = true;
    }
  });
  return current.filter(function(annot) {
    const shouldRemove =
      (annot.id && annot.id in ids) || (annot.$tag && annot.$tag in tags);
    return !shouldRemove;
  });
}

function findByID(annotations, id) {
  return annotations.find(function(annot) {
    return annot.id === id;
  });
}

function findByTag(annotations, tag) {
  return annotations.find(function(annot) {
    return annot.$tag === tag;
  });
}

/**
 * Set custom private fields on an annotation object about to be added to the
 * store's collection of `annotations`.
 *
 * `annotation` may either be new (unsaved) or a persisted annotation retrieved
 * from the service.
 *
 * @param {Object} annotation
 * @param {Number} tag - The `$tag` value that should be used for this
 *                       if it doesn't have a `$tag` already
 * @return {Object} - annotation with local (`$*`) fields set
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

function init() {
  return {
    annotations: [],

    // The local tag to assign to the next annotation that is loaded into the
    // app
    nextTag: 1,
  };
}

const update = {
  ADD_ANNOTATIONS: function(state, action) {
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
        added.push(initializeAnnotation(annot, 't' + nextTag));
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
      nextTag: nextTag,
    };
  },

  REMOVE_ANNOTATIONS: function(state, action) {
    return {
      annotations: [...action.remainingAnnotations],
    };
  },

  CLEAR_ANNOTATIONS: function() {
    return { annotations: [] };
  },

  UPDATE_FLAG_STATUS: function(state, action) {
    const annotations = state.annotations.map(function(annot) {
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
          newAnn.moderation = Object.assign({}, annot.moderation, {
            flagCount: annot.moderation.flagCount + countDelta,
          });
        }
        return newAnn;
      } else {
        return annot;
      }
    });
    return { annotations: annotations };
  },

  UPDATE_ANCHOR_STATUS: function(state, action) {
    const annotations = state.annotations.map(function(annot) {
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
    return { annotations: annotations };
  },

  HIDE_ANNOTATION: function(state, action) {
    const anns = state.annotations.map(function(ann) {
      if (ann.id !== action.id) {
        return ann;
      }
      return Object.assign({}, ann, { hidden: true });
    });
    return { annotations: anns };
  },

  UNHIDE_ANNOTATION: function(state, action) {
    const anns = state.annotations.map(function(ann) {
      if (ann.id !== action.id) {
        return ann;
      }
      return Object.assign({}, ann, { hidden: false });
    });
    return { annotations: anns };
  },
};

const actions = util.actionTypes(update);

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
    id: id,
    isFlagged: isFlagged,
  };
}

/**
 * Add these `annotations` to the current collection of annotations in the store.
 *
 * @param {Object}[] annotations - Array of annotation objects to add.
 */
function addAnnotations(annotations) {
  return function(dispatch, getState) {
    const added = annotations.filter(annot => {
      return !findByID(getState().annotations.annotations, annot.id);
    });

    dispatch({
      type: actions.ADD_ANNOTATIONS,
      annotations: annotations,
      currentAnnotationCount: getState().annotations.annotations.length,
    });

    // If we're not in the sidebar, we're done here.
    // FIXME Split the annotation-adding from the anchoring code; possibly
    // move into service
    if (route.selectors.route(getState()) !== 'sidebar') {
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
          .map(id => findByID(anns, id))
          .filter(ann => ann && metadata.isWaitingToAnchor(ann));

        // Mark anchoring as timed-out for these annotations.
        const anchorStatusUpdates = annsStillAnchoring.reduce(
          (updates, ann) => {
            updates[ann.$tag] = 'timeout';
            return updates;
          },
          {}
        );
        dispatch(updateAnchorStatus(anchorStatusUpdates));
      }, ANCHORING_TIMEOUT);
    }
  };
}

/**
 * Remove annotations from the currently displayed set.
 *
 * @param {Annotation[]} annotations -
 *   Annotations to remove. These may be complete annotations or stubs which
 *   only contain an `id` property.
 */
function removeAnnotations(annotations) {
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

/** Set the currently displayed annotations to the empty set. */
function clearAnnotations() {
  return { type: actions.CLEAR_ANNOTATIONS };
}

/**
 * Update the anchoring status of an annotation.
 *
 * @param {{ [tag: string]: 'anchored'|'orphan'|'timeout'} } statusUpdates - A map of annotation tag to orphan status
 */
function updateAnchorStatus(statusUpdates) {
  return {
    type: actions.UPDATE_ANCHOR_STATUS,
    statusUpdates,
  };
}

/**
 * Update the local hidden state of an annotation.
 *
 * This updates an annotation to reflect the fact that it has been hidden from
 * non-moderators.
 */
function hideAnnotation(id) {
  return {
    type: actions.HIDE_ANNOTATION,
    id: id,
  };
}

/**
 * Update the local hidden state of an annotation.
 *
 * This updates an annotation to reflect the fact that it has been made visible
 * to non-moderators.
 */
function unhideAnnotation(id) {
  return {
    type: actions.UNHIDE_ANNOTATION,
    id: id,
  };
}

/**
 * Return all loaded annotations which have been saved to the server.
 *
 * @param {state} - The global app state
 */
function savedAnnotations(state) {
  return state.annotations.annotations.filter(function(ann) {
    return !metadata.isNew(ann);
  });
}

/** Return true if the annotation with a given ID is currently loaded. */
function annotationExists(state, id) {
  return state.annotations.annotations.some(function(annot) {
    return annot.id === id;
  });
}

/**
 * Return the IDs of annotations that correspond to `tags`.
 *
 * If an annotation does not have an ID because it has not been created on
 * the server, there will be no entry for it in the returned array.
 *
 * @param {string[]} Local tags of annotations to look up
 */
function findIDsForTags(state, tags) {
  const ids = [];
  tags.forEach(function(tag) {
    const annot = findByTag(state.annotations.annotations, tag);
    if (annot && annot.id) {
      ids.push(annot.id);
    }
  });
  return ids;
}

/**
 * Return the annotation with the given ID.
 */
function findAnnotationByID(state, id) {
  return findByID(state.annotations.annotations, id);
}

/**
 * Return all loaded annotations that are not highlights and have not been saved
 * to the server.
 */
const newAnnotations = createSelector(
  state => state.annotations.annotations,
  annotations =>
    annotations.filter(ann => metadata.isNew(ann) && !metadata.isHighlight(ann))
);

/**
 * Return all loaded annotations that are highlights and have not been saved
 * to the server.
 */
const newHighlights = createSelector(
  state => state.annotations.annotations,
  annotations =>
    annotations.filter(ann => metadata.isNew(ann) && metadata.isHighlight(ann))
);

/**
 * Return the number of page notes.
 */
const noteCount = createSelector(
  state => state.annotations.annotations,
  annotations => arrayUtil.countIf(annotations, metadata.isPageNote)
);

/**
 * Returns the number of annotations (as opposed to notes or orphans).
 */
const annotationCount = createSelector(
  state => state.annotations.annotations,
  annotations => arrayUtil.countIf(annotations, metadata.isAnnotation)
);

/**
 * Returns the number of orphaned annotations.
 */
const orphanCount = createSelector(
  state => state.annotations.annotations,
  annotations => arrayUtil.countIf(annotations, metadata.isOrphan)
);

/**
 * Returns true if some annotations have not been anchored yet.
 */
const isWaitingToAnchorAnnotations = createSelector(
  state => state.annotations.annotations,
  annotations => annotations.some(metadata.isWaitingToAnchor)
);

export default {
  init: init,
  namespace: 'annotations',
  update: update,
  actions: {
    addAnnotations,
    clearAnnotations,
    hideAnnotation,
    removeAnnotations,
    updateAnchorStatus,
    updateFlagStatus,
    unhideAnnotation,
  },

  selectors: {
    annotationCount,
    annotationExists,
    findAnnotationByID,
    findIDsForTags,
    isWaitingToAnchorAnnotations,
    newAnnotations,
    newHighlights,
    noteCount,
    orphanCount,
    savedAnnotations,
  },
};
