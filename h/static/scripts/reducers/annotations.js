/**
 * State management for the set of annotations currently loaded into the
 * sidebar.
 */

'use strict';

var arrayUtil = require('../util/array-util');
var metadata = require('../annotation-metadata');
var uiConstants = require('../ui-constants');

var selection = require('./selection');

var actions = {
  ADD_ANNOTATIONS: 'ADD_ANNOTATIONS',
  REMOVE_ANNOTATIONS: 'REMOVE_ANNOTATIONS',
  CLEAR_ANNOTATIONS: 'CLEAR_ANNOTATIONS',

  /**
   * Update an annotation's status flags after attempted anchoring in the
   * document completes.
   */
  UPDATE_ANCHOR_STATUS: 'UPDATE_ANCHOR_STATUS',
};

/**
 * Return a copy of `current` with all matching annotations in `annotations`
 * removed.
 */
function excludeAnnotations(current, annotations) {
  var ids = {};
  var tags = {};
  annotations.forEach(function (annot) {
    if (annot.id) {
      ids[annot.id] = true;
    }
    if (annot.$$tag) {
      tags[annot.$$tag] = true;
    }
  });
  return current.filter(function (annot) {
    var shouldRemove = (annot.id && (annot.id in ids)) ||
                       (annot.$$tag && (annot.$$tag in tags));
    return !shouldRemove;
  });
}

function findByID(annotations, id) {
  return annotations.find(function (annot) {
    return annot.id === id;
  });
}

function findByTag(annotations, tag) {
  return annotations.find(function (annot) {
    return annot.$$tag === tag;
  });
}

/**
 * Initialize the status flags and properties of a new annotation.
 */
function initializeAnnot(annotation) {
  if (annotation.id) {
    return annotation;
  }

  // Currently the user ID, permissions and group of new annotations are
  // initialized in the <annotation> component controller because the session
  // state and focused group are not stored in the Redux store. Once they are,
  // that initialization should be moved here.

  return Object.assign({}, annotation, {
    // Copy $$tag explicitly because it is non-enumerable.
    //
    // FIXME: change $$tag to $tag and make it enumerable so annotations can be
    // handled more simply in the sidebar.
    $$tag: annotation.$$tag,
    // New annotations must be anchored
    $orphan: false,
  });
}

function init() {
  return {
    annotations: [],
  };
}

function update(state, action) {
  switch (action.type) {
  case actions.ADD_ANNOTATIONS:
    {
      var updatedIDs = {};
      var updatedTags = {};

      var added = [];
      var unchanged = [];
      var updated = [];

      action.annotations.forEach(function (annot) {
        var existing;
        if (annot.id) {
          existing = findByID(state.annotations, annot.id);
        }
        if (!existing && annot.$$tag) {
          existing = findByTag(state.annotations, annot.$$tag);
        }

        if (existing) {
          // Merge the updated annotation with the private fields from the local
          // annotation
          updated.push(Object.assign({}, existing, annot));
          if (annot.id) {
            updatedIDs[annot.id] = true;
          }
          if (existing.$$tag) {
            updatedTags[existing.$$tag] = true;
          }
        } else {
          added.push(initializeAnnot(annot));
        }
      });

      state.annotations.forEach(function (annot) {
        if (!updatedIDs[annot.id] && !updatedTags[annot.$$tag]) {
          unchanged.push(annot);
        }
      });

      return Object.assign({}, state, {
        annotations: added.concat(updated).concat(unchanged),
      });
    }
  case actions.REMOVE_ANNOTATIONS:
    {
      var annots = excludeAnnotations(state.annotations, action.annotations);
      var selectedTab = state.selectedTab;
      if (selectedTab === uiConstants.TAB_ORPHANS &&
          arrayUtil.countIf(annots, metadata.isOrphan) === 0) {
        selectedTab = uiConstants.TAB_ANNOTATIONS;
      }
      return Object.assign(
        {},
        state,
        {annotations: annots},
        selection.selectTabHelper(state, selectedTab)
      );
    }
  case actions.CLEAR_ANNOTATIONS:
    return Object.assign({}, state, {annotations: []});
  case actions.UPDATE_ANCHOR_STATUS:
    {
      var annotations = state.annotations.map(function (annot) {
        var match = (annot.id && annot.id === action.id) ||
                    (annot.$$tag && annot.$$tag === action.tag);
        if (match) {
          return Object.assign({}, annot, {
            $orphan: action.isOrphan,
            $$tag: action.tag,
          });
        } else {
          return annot;
        }
      });
      return Object.assign({}, state, {annotations: annotations});
    }
  default:
    return state;
  }
}

/** Add annotations to the currently displayed set. */
function addAnnotations(annotations, now) {
  now = now || new Date();

  // Add dates to new annotations. These are ignored by the server but used
  // when sorting unsaved annotation cards.
  annotations = annotations.map(function (annot) {
    if (annot.id) { return annot; }
    return Object.assign({
      // Copy $$tag explicitly because it is non-enumerable.
      //
      // FIXME: change $$tag to $tag and make it enumerable so annotations
      // can be handled more simply in the sidebar.
      $$tag: annot.$$tag,
      // Date.prototype.toISOString returns a 0-offset (UTC) ISO8601
      // datetime.
      created: now.toISOString(),
      updated: now.toISOString(),
    }, annot);
  });

  return function (dispatch, getState) {
    var added = annotations.filter(function (annot) {
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
    var ANCHORING_TIMEOUT = 500;

    var anchoringAnnots = added.filter(metadata.isWaitingToAnchor);
    if (anchoringAnnots.length) {
      setTimeout(function () {
        arrayUtil
          .filterMap(anchoringAnnots, function (annot) {
            return findByID(getState().annotations, annot.id);
          })
          .filter(metadata.isWaitingToAnchor)
          .forEach(function (orphan) {
            dispatch({
              type: actions.UPDATE_ANCHOR_STATUS,
              id: orphan.id,
              tag: orphan.$$tag,
              isOrphan: true,
            });
          });
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
  return {type: actions.CLEAR_ANNOTATIONS};
}

/**
 * Updating the local tag and anchoring status of an annotation.
 *
 * @param {string|null} id - Annotation ID
 * @param {string} tag - The local tag assigned to this annotation to link
 *        the object in the page and the annotation in the sidebar
 * @param {boolean} isOrphan - True if the annotation failed to anchor
 */
function updateAnchorStatus(id, tag, isOrphan) {
  return {
    type: actions.UPDATE_ANCHOR_STATUS,
    id: id,
    tag: tag,
    isOrphan: isOrphan,
  };
}

module.exports = {
  init: init,
  update: update,

  // Actions
  addAnnotations: addAnnotations,
  clearAnnotations: clearAnnotations,
  removeAnnotations: removeAnnotations,
  updateAnchorStatus: updateAnchorStatus,
};
