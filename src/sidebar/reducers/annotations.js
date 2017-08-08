/**
 * State management for the set of annotations currently loaded into the
 * sidebar.
 */

'use strict';

var arrayUtil = require('../util/array-util');
var metadata = require('../annotation-metadata');
var uiConstants = require('../ui-constants');

var selection = require('./selection');
var util = require('./util');

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
    if (annot.$tag) {
      tags[annot.$tag] = true;
    }
  });
  return current.filter(function (annot) {
    var shouldRemove = (annot.id && (annot.id in ids)) ||
                       (annot.$tag && (annot.$tag in tags));
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
    return annot.$tag === tag;
  });
}

/**
 * Initialize the status flags and properties of a new annotation.
 */
function initializeAnnot(annotation, tag) {
  var orphan = annotation.$orphan;

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
    groups: {},

    // The local tag to assign to the next annotation that is loaded into the
    // app
    nextTag: 1,
  };
}

var update = {

  ADD_GROUP_ANNOTATIONS: function ADD_GROUP_ANNOTATIONS(state, action) {
    state.groups = Object.assign(state.groups, action.groups);
    _showGroupActivity(state.groups);
    return {
      groups: state.groups,
    };
  },

  ADD_GROUP_ANNOTATION: function ADD_GROUP_ANNOTATION(state, action) {
    var ann = action.annotation;
    state.groups[ann.group][ann.id] = null;
    _showGroupActivity(state.groups);
    return {
      groups: state.groups,
    };
  },

  REMOVE_GROUP_ANNOTATION: function REMOVE_GROUP_ANNOTATION(state, action) {
    var ann = action.annotation;
    delete state.groups[ann.group][ann.id];
    _showGroupActivity(state.groups);
    return {
      groups: state.groups,
    };
  },

  ADD_ANNOTATIONS: function (state, action) {
    var updatedIDs = {};
    var updatedTags = {};

    var added = [];
    var unchanged = [];
    var updated = [];
    var nextTag = state.nextTag;

    action.annotations.forEach(function (annot) {
      var existing;
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

    state.annotations.forEach(function (annot) {
      if (!updatedIDs[annot.id] && !updatedTags[annot.$tag]) {
        unchanged.push(annot);
      }
    });

    return {
      annotations: added.concat(updated).concat(unchanged),
      nextTag: nextTag,
    };
  },

  REMOVE_ANNOTATIONS: function (state, action) {
    var annots = excludeAnnotations(state.annotations, action.annotations);
    var selectedTab = state.selectedTab;
    if (selectedTab === uiConstants.TAB_ORPHANS &&
        arrayUtil.countIf(annots, metadata.isOrphan) === 0) {
      selectedTab = uiConstants.TAB_ANNOTATIONS;
    }

    var tabUpdateFn = selection.update.SELECT_TAB;
    return Object.assign(
      {annotations: annots},
      tabUpdateFn(state, selection.actions.selectTab(selectedTab))
    );
  },

  CLEAR_ANNOTATIONS: function () {
    return {annotations: []};
  },

  UPDATE_FLAG_STATUS: function (state, action) {
    var annotations = state.annotations.map(function (annot) {
      var match = (annot.id && annot.id === action.id);
      if (match) {
        if (annot.flagged === action.isFlagged) {
          return annot;
        }

        var newAnn = Object.assign({}, annot, {
          flagged: action.isFlagged,
        });
        if (newAnn.moderation) {
          var countDelta = action.isFlagged ? 1 : -1;
          newAnn.moderation = Object.assign({}, annot.moderation, {
            flagCount: annot.moderation.flagCount + countDelta,
          });
        }
        return newAnn;
      } else {
        return annot;
      }
    });
    return {annotations: annotations};
  },

  UPDATE_ANCHOR_STATUS: function (state, action) {
    var annotations = state.annotations.map(function (annot) {
      var match = (annot.id && annot.id === action.id) ||
                  (annot.$tag && annot.$tag === action.tag);
      if (match) {
        return Object.assign({}, annot, {
          $anchorTimeout: action.anchorTimeout || annot.$anchorTimeout,
          $orphan: action.isOrphan,
          $tag: action.tag,
        });
      } else {
        return annot;
      }
    });
    return {annotations: annotations};
  },

  HIDE_ANNOTATION: function (state, action) {
    var anns = state.annotations.map(function (ann) {
      if (ann.id !== action.id) {
        return ann;
      }
      return Object.assign({}, ann, { hidden: true });
    });
    return {annotations: anns};
  },

  UNHIDE_ANNOTATION: function (state, action) {
    var anns = state.annotations.map(function (ann) {
      if (ann.id !== action.id) {
        return ann;
      }
      return Object.assign({}, ann, { hidden: false });
    });
    return {annotations: anns};
  },
};

var actions = util.actionTypes(update);

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

function addGroupAnnotation(ann) {
  return {
    type: actions.ADD_GROUP_ANNOTATION,
    annotation: ann,
  };
}

function addGroupAnnotations(annotations) {
  var groups = {};

  annotations.forEach(function (annot) {
    var group = annot.group;

    if (!groups[group]) {
      groups[group] = {};
    }

    groups[group][annot.id] = null;
  });

  return {
    type: actions.ADD_GROUP_ANNOTATIONS,
    groups: groups,
  };
}

function removeGroupAnnotation(ann) {
  return {
    type: actions.REMOVE_GROUP_ANNOTATION,
    annotation: ann,
  };
}

function _showGroupActivity(groups) {
  var scopeSelectorNodes = Array.prototype.slice.call(document.querySelectorAll('.group-list li'));
  scopeSelectorNodes.forEach(function (li) {
    var groupId = li.querySelector('.group-id');

    if (! groupId) { return; }

    groupId = groupId.innerHTML.replace(/\s/g, '');

    var count = 0;

    if (groups[groupId]) {
      count = Object.keys(groups[groupId]).length;
    }

    var iconContainer = li.querySelector('.group-icon-container');

    if (count > 0) {
      iconContainer.style.color = 'red';
      li.querySelector('.group-count').innerHTML = '(' + count + ')';
    } else {
      iconContainer.style.color = '';
      li.querySelector('.group-count').innerHTML = '';
    }

  });
}


/** Add annotations to the currently displayed set. */
function addAnnotations(annotations, now) {
  now = now || new Date();

  // Add dates to new annotations. These are ignored by the server but used
  // when sorting unsaved annotation cards.
  annotations = annotations.map(function (annot) {
    if (annot.id) { return annot; }
    return Object.assign({
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
              anchorTimeout: true,
              id: orphan.id,
              tag: orphan.$tag,
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
  return state.annotations.filter(function (ann) {
    return !metadata.isNew(ann);
  });
}

/** Return true if the annotation with a given ID is currently loaded. */
function annotationExists(state, id) {
  return state.annotations.some(function (annot) {
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
  var ids = [];
  tags.forEach(function (tag) {
    var annot = findByTag(state.annotations, tag);
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

module.exports = {
  init: init,
  update: update,
  actions: {
    addAnnotations: addAnnotations,
    addGroupAnnotation: addGroupAnnotation,
    addGroupAnnotations: addGroupAnnotations,
    removeGroupAnnotation: removeGroupAnnotation,
    clearAnnotations: clearAnnotations,
    removeAnnotations: removeAnnotations,
    updateAnchorStatus: updateAnchorStatus,
    updateFlagStatus: updateFlagStatus,
    hideAnnotation: hideAnnotation,
    unhideAnnotation: unhideAnnotation,
  },

  // Selectors
  annotationExists: annotationExists,
  findAnnotationByID: findAnnotationByID,
  findIDsForTags: findIDsForTags,
  savedAnnotations: savedAnnotations,
};
