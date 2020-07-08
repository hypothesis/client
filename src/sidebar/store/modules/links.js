/**
 * Reducer for storing a "links" object in the Redux state store.
 *
 * The links object is initially null, and can only be updated by completely
 * replacing it with a new links object.
 *
 * Used by serviceUrl.
 */

/** Return the initial links. */
function init() {
  return null;
}

/** Return updated links based on the given current state and action object. */
function updateLinks(state, action) {
  return { ...action.newLinks };
}

/** Return an action object for updating the links to the given newLinks. */
function updateLinksAction(newLinks) {
  return { type: 'UPDATE_LINKS', newLinks: newLinks };
}

/**
 * @typedef LinksStore
 *
 * // actions
 * @prop {typeof updateLinks} updateLinksAction
 */

export default {
  init: init,
  namespace: 'links',
  update: { UPDATE_LINKS: updateLinks },
  actions: { updateLinks: updateLinksAction },
  selectors: {},
};
