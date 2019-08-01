/**
 * State management for the set of annotations currently loaded into the
 * sidebar.
 */

'use strict';

const { createSelector } = require('reselect');

const arrayUtil = require('../../util/array-util');
const metadata = require('../../util/annotation-metadata');
const uiConstants = require('../../ui-constants');

const selection = require('./selection');
const drafts = require('./drafts');
const util = require('../util');

/**
 * Return a copy of `current` with all matching annotations in `annotations`
 * removed.
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
 * Initialize the status flags and properties of a new annotation.
 */
function initializeAnnot(annotation, tag) {
  let orphan = annotation.$orphan;

  if (!annotation.id) {
    // Currently the user ID, permissions and group of new annotations are
    // initialized in the <annotation> component controller because the session
    // state and focused group are not stored in the Redux store. Once they are,
    // that initialization should be moved here.

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

    action.annotations.forEach(function(annot) {
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
        added.push(initializeAnnot(annot, 't' + nextTag));
        ++nextTag;
      }
    });

    state.annotations.forEach(function(annot) {
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
    const annots = excludeAnnotations(state.annotations, action.annotations);
    let selectedTab = state.selectedTab;
    if (
      selectedTab === uiConstants.TAB_ORPHANS &&
      arrayUtil.countIf(annots, metadata.isOrphan) === 0
    ) {
      selectedTab = uiConstants.TAB_ANNOTATIONS;
    }

    const tabUpdateFn = selection.update.SELECT_TAB;
    return Object.assign(
      { annotations: annots },
      tabUpdateFn(state, selection.actions.selectTab(selectedTab))
    );
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

/** Add annotations to the currently displayed set. */
function addAnnotations(annotations, now) {
  now = now || new Date();

  // Add dates to new annotations. These are ignored by the server but used
  // when sorting unsaved annotation cards.
  annotations = annotations.map(function(annot) {
    if (annot.id) {
      return annot;
    }
    return Object.assign(
      {
        // Date.prototype.toISOString returns a 0-offset (UTC) ISO8601
        // datetime.
        created: now.toISOString(),
        updated: now.toISOString(),
      },
      annot
    );
  });

  return function(dispatch, getState) {
    const added = annotations.filter(function(annot) {
      return !findByID(getState().annotations, annot.id);
    });

    dispatch({
      type: actions.ADD_ANNOTATIONS,
      annotations: annotations,
    });

    if (!getState().isSidebar) {
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
        const anns = getState().annotations;
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

/** Remove annotations from the currently displayed set. */
function removeAnnotations(annotations) {
  return {
    type: actions.REMOVE_ANNOTATIONS,
    annotations: annotations,
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
 * Create a new annotation
 *
 * The method does 4 tasks:
 * 1. Removes any existing empty drafts.
 * 2. Creates a new annotation.
 * 3. Changes the focused tab to match that of the newly created annotation.
 * 4. Expands the collapsed state of all new annotation's parents.
 */
function createAnnotation(ann) {
  return dispatch => {
    // When a new annotation is created, remove any existing annotations
    // that are empty.
    dispatch(drafts.actions.deleteNewAndEmptyDrafts([ann]));
    dispatch(addAnnotations([ann]));
    // If the annotation is of type note or annotation, make sure
    // the appropriate tab is selected. If it is of type reply, user
    // stays in the selected tab.
    if (metadata.isPageNote(ann)) {
      dispatch(selection.actions.selectTab(uiConstants.TAB_NOTES));
    } else if (metadata.isAnnotation(ann)) {
      dispatch(selection.actions.selectTab(uiConstants.TAB_ANNOTATIONS));
    }
    (ann.references || []).forEach(parent => {
      // Expand any parents of this annotation.
      dispatch(selection.actions.setCollapsed(parent, false));
    });
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
  return state.annotations.filter(function(ann) {
    return !metadata.isNew(ann);
  });
}

/** Return true if the annotation with a given ID is currently loaded. */
function annotationExists(state, id) {
  return state.annotations.some(function(annot) {
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
    const annot = findByTag(state.annotations, tag);
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
  return findByID(state.annotations, id);
}

/**
 * Return the number of page notes.
 */
const noteCount = createSelector(
  state => state.annotations,
  annotations => arrayUtil.countIf(annotations, metadata.isPageNote)
);

/**
 * Returns the number of annotations (as opposed to notes or orphans).
 */
const annotationCount = createSelector(
  state => state.annotations,
  annotations => arrayUtil.countIf(annotations, metadata.isAnnotation)
);

/**
 * Returns the number of orphaned annotations.
 */
const orphanCount = createSelector(
  state => state.annotations,
  annotations => arrayUtil.countIf(annotations, metadata.isOrphan)
);

/**
 * Returns true if some annotations have not been anchored yet.
 */
const isWaitingToAnchorAnnotations = createSelector(
  state => state.annotations,
  annotations => annotations.some(metadata.isWaitingToAnchor)
);

module.exports = {
  init: init,
  update: update,
  actions: {
    addAnnotations,
    clearAnnotations,
    createAnnotation,
    hideAnnotation,
    removeAnnotations,
    updateAnchorStatus,
    updateFlagStatus,
    unhideAnnotation,
  },

  selectors: {
    annotationExists,
    noteCount,
    annotationCount,
    orphanCount,
    isWaitingToAnchorAnnotations,
    findAnnotationByID,
    findIDsForTags,
    savedAnnotations,
  },
};
