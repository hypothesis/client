import * as util from '../util';

/**
 * This module defines actions and state related to the display mode of the
 * sidebar.
 */

function init() {
  return {
    visibleHighlights: false,
  };
}

const update = {
  SET_HIGHLIGHTS_VISIBLE: function(state, action) {
    return { visibleHighlights: action.visible };
  },
};

const actions = util.actionTypes(update);

/**
 * Sets whether annotation highlights in connected documents are shown
 * or not.
 */
function setShowHighlights(show) {
  return { type: actions.SET_HIGHLIGHTS_VISIBLE, visible: show };
}

export default {
  init: init,
  namespace: 'viewer',
  update: update,
  actions: {
    setShowHighlights: setShowHighlights,
  },
  selectors: {},
};
