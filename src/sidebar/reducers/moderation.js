'use strict';

/**
 * This module defines application state and actions related to flagging and
 * moderation status of annotations.
 */

var toSet = require('../util/array-util').toSet;
var util = require('./util');

function init() {
  return {
    // Map of ID -> number of times annotation has been flagged by users.
    flagCounts: {},
    // IDs of annotations hidden by a moderator.
    hiddenByModerator: {},
  };
}

function toggle(map, key, enable) {
  var newMap = Object.assign({}, map);
  if (enable) {
    newMap[key] = true;
  } else {
    delete newMap[key];
  }
  return newMap;
}

var update = {
  ANNOTATION_HIDDEN_CHANGED: function (state, action) {
    return {
      hiddenByModerator: toggle(state.hiddenByModerator, action.id, action.hidden),
    };
  },

  FETCHED_FLAG_COUNTS: function (state, action) {
    return { flagCounts: action.flagCounts };
  },

  FETCHED_HIDDEN_IDS: function (state, action) {
    return { hiddenByModerator: toSet(action.ids) };
  },
};

var actions = util.actionTypes(update);

/**
 * Update the flag counts for annotations.
 *
 * @param {Object} flagCounts - Map from ID to count of flags
 */
function fetchedFlagCounts(flagCounts) {
  return {
    type: actions.FETCHED_FLAG_COUNTS,
    flagCounts: flagCounts,
  };
}

/**
 * Update the set of annotations hidden by a moderator.
 */
function fetchedHiddenByModeratorIds(ids) {
  return {
    type: actions.FETCHED_HIDDEN_IDS,
    ids: ids,
  };
}

/**
 * An annotation was hidden or unhidden by a moderator.
 */
function annotationHiddenChanged(id, hidden) {
  return {
    type: actions.ANNOTATION_HIDDEN_CHANGED,
    id: id,
    hidden: hidden,
  };
}

/**
 * Return the number of items an annotation with a given `id` has been flagged
 * by members of the annotation's group.
 */
function flagCount(state, id) {
  return state.flagCounts[id] || 0;
}

/**
 * Return `true` if an annotation was hidden by a moderator.
 */
function isHiddenByModerator(state, id) {
  return !!state.hiddenByModerator[id];
}

module.exports = {
  init: init,
  update: update,

  actions: {
    annotationHiddenChanged: annotationHiddenChanged,
    fetchedFlagCounts: fetchedFlagCounts,
    fetchedHiddenByModeratorIds: fetchedHiddenByModeratorIds,
  },

  // Selectors
  isHiddenByModerator: isHiddenByModerator,
  flagCount: flagCount,
};
