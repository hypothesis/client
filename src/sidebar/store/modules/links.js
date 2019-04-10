/**
 * Reducer for storing a "links" object in the Redux state store.
 *
 * The links object is initially null, and can only be updated by completely
 * replacing it with a new links object.
 *
 * Used by serviceUrl.
 */

'use strict';

/** Return the initial links. */
function init() {
  return { links: null };
}

/** Return updated links based on the given current state and action object. */
function updateLinks(state, action) {
  return { links: action.newLinks };
}

/** Return an action object for updating the links to the given newLinks. */
function updateLinksAction(newLinks) {
  return { type: 'UPDATE_LINKS', newLinks: newLinks };
}

module.exports = {
  init: init,
  update: { UPDATE_LINKS: updateLinks },
  actions: { updateLinks: updateLinksAction },
  selectors: {},
};
