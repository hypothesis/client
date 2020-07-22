import * as util from '../util';

/**
 * This module defines actions and state related to the display mode of the
 * sidebar.
 */

function init() {
  return {
    // Has the sidebar ever been opened? NB: This is not necessarily the
    // current state of the sidebar, but tracks whether it has ever been open
    sidebarHasOpened: false,
    visibleHighlights: false,
  };
}

const update = {
  SET_HIGHLIGHTS_VISIBLE: function (state, action) {
    return { visibleHighlights: action.visible };
  },
  SET_SIDEBAR_OPENED: (state, action) => {
    if (action.opened === true) {
      // If the sidebar is open, track that it has ever been opened
      return { sidebarHasOpened: true };
    }
    // Otherwise, nothing to do here
    return {};
  },
};

const actions = util.actionTypes(update);

// Action creators

/**
 * Sets whether annotation highlights in connected documents are shown
 * or not.
 */
function setShowHighlights(show) {
  return { type: actions.SET_HIGHLIGHTS_VISIBLE, visible: show };
}

/**
 * @param {boolean} opened - If the sidebar is open
 */
function setSidebarOpened(opened) {
  return { type: actions.SET_SIDEBAR_OPENED, opened };
}

// Selectors

function hasSidebarOpened(state) {
  return state.sidebarHasOpened;
}

/**
 * @typedef ViewerStore
 *
 * // Actions
 * @prop {typeof setShowHighlights} setShowHighlights
 * @prop {typeof setSidebarOpened} setSidebarOpened
 *
 * // Selectors
 * @prop {() => boolean} hasSidebarOpened
 */

export default {
  init: init,
  namespace: 'viewer',
  update: update,
  actions: {
    setShowHighlights,
    setSidebarOpened,
  },
  selectors: {
    hasSidebarOpened,
  },
};
