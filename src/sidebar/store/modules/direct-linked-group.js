'use strict';

const util = require('../util');

function init() {
  return {
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
};

const actions = util.actionTypes(update);

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

module.exports = {
  init,
  update,
  actions: {
    setDirectLinkedGroupFetchFailed,
    clearDirectLinkedGroupFetchFailed,
  },
  selectors: {},
};
