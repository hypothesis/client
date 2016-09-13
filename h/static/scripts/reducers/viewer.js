'use strict';

/**
 * This module defines actions and state related to the display mode of the
 * sidebar.
 */

var actions = {
  /** Sets whether annotated text is highlighted in the page. */
  SET_HIGHLIGHTS_VISIBLE: 'SET_HIGHLIGHTS_VISIBLE',

  /**
   * Set whether the app is the sidebar or not.
   *
   * When not in the sidebar, we do not expect annotations to anchor and always
   * display all annotations, rather than only those in the current tab.
   */
  SET_SIDEBAR: 'SET_SIDEBAR',
};

function init() {
  return {
    // Flag that indicates whether the app is the sidebar and connected to
    // a page where annotations are being shown in context
    isSidebar: true,

    visibleHighlights: false,
  };
}

function update(state, action) {
  switch (action.type) {
  case actions.SET_SIDEBAR:
    return Object.assign({}, state, {isSidebar: action.isSidebar});
  case actions.SET_HIGHLIGHTS_VISIBLE:
    return Object.assign({}, state, {visibleHighlights: action.visible});
  default:
    return state;
  }
}

/** Set whether the app is the sidebar */
function setAppIsSidebar(isSidebar) {
  return {type: actions.SET_SIDEBAR, isSidebar: isSidebar};
}

/**
 * Sets whether annotation highlights in connected documents are shown
 * or not.
 */
function setShowHighlights(show) {
  return {type: actions.SET_HIGHLIGHTS_VISIBLE, visible: show};
}

module.exports = {
  init: init,
  update: update,

  // Actions
  setAppIsSidebar: setAppIsSidebar,
  setShowHighlights: setShowHighlights,
};
