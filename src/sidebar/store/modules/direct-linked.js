'use strict';

const util = require('../util');

function init(settings) {
  return {
    /**
     * The id of the direct-linked group.
     * @type {string}
     */
    directLinkedGroupId: settings.group || null,

    /**
     * The id of the direct-linked annotation's group.
     * @type {string}
     */
    directLinkedAnnotationsId: settings.annotations || null,

    /**
     * Indicates that an error occured in retrieving/showing the direct linked group.
     * This could be because:
     * - the group does not exist
     * - the user does not have permission
     * - the group is out of scope for the given page
     * @type {boolean}
     */
    directLinkedGroupFetchFailed: false,
  };
}

const update = {
  UPDATE_DIRECT_LINKED_GROUP_FETCH_FAILED(state, action) {
    return {
      directLinkedGroupFetchFailed: action.directLinkedGroupFetchFailed,
    };
  },
  UPDATE_DIRECT_LINKED_GROUP_ID(state, action) {
    return {
      directLinkedGroupId: action.directLinkedGroupId,
    };
  },
  UPDATE_DIRECT_LINKED_ANNOTATIONS_ID(state, action) {
    return {
      directLinkedAnnotationsId: action.directLinkedAnnotationsId,
    };
  },
  CLEAR_DIRECT_LINKED_IDS() {
    return {
      directLinkedAnnotationsId: null,
      directLinkedGroupId: null,
    };
  },
};

const actions = util.actionTypes(update);

/**
 * Set the direct linked group id.
 */
function setDirectLinkedGroupId(groupId) {
  return {
    type: actions.UPDATE_DIRECT_LINKED_GROUP_ID,
    directLinkedGroupId: groupId,
  };
}

/**
 * Set the direct linked annotation's id.
 */
function setDirectLinkedAnnotationsId(annId) {
  return {
    type: actions.UPDATE_DIRECT_LINKED_ANNOTATIONS_ID,
    directLinkedAnnotationsId: annId,
  };
}

/**
 * Set the direct linked group fetch failure to true.
 */
function setDirectLinkedGroupFetchFailed() {
  return {
    type: actions.UPDATE_DIRECT_LINKED_GROUP_FETCH_FAILED,
    directLinkedGroupFetchFailed: true,
  };
}

/**
 * Clear the direct linked group fetch failure.
 */
function clearDirectLinkedGroupFetchFailed() {
  return {
    type: actions.UPDATE_DIRECT_LINKED_GROUP_FETCH_FAILED,
    directLinkedGroupFetchFailed: false,
  };
}

/**
 * Clear the direct linked annotations and group id's.
 */
function clearDirectLinkedIds() {
  return {
    type: actions.CLEAR_DIRECT_LINKED_IDS,
  };
}

module.exports = {
  init,
  update,
  actions: {
    setDirectLinkedGroupFetchFailed,
    setDirectLinkedGroupId,
    setDirectLinkedAnnotationsId,
    clearDirectLinkedGroupFetchFailed,
    clearDirectLinkedIds,
  },
  selectors: {},
};
