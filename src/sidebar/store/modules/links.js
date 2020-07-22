import { actionTypes } from '../util';

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

const update = {
  UPDATE_LINKS(state, action) {
    return {
      ...action.newLinks,
    };
  },
};

const actions = actionTypes(update);

/** Return updated links based on the given current state and action object. */
function updateLinks(newLinks) {
  return {
    type: actions.UPDATE_LINKS,
    newLinks,
  };
}

/**
 * @typedef LinksStore
 *
 * // Actions
 * @prop {typeof updateLinks} updateLinks
 */

export default {
  init: init,
  namespace: 'links',
  update,
  actions: {
    updateLinks,
  },
  selectors: {},
};
