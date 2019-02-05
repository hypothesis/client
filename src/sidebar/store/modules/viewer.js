'use strict';

const util = require('../util');

/**
 * This module defines actions and state related to the display mode of the
 * sidebar.
 */

function init() {
  return {
    // Flag that indicates whether the app is the sidebar and connected to
    // a page where annotations are being shown in context.
    //
    // Note that this flag is not available early in the lifecycle of the
    // application.
    isSidebar: true,

    visibleHighlights: false,
  };
}

const update = {
  SET_SIDEBAR: function(state, action) {
    return { isSidebar: action.isSidebar };
  },
  SET_HIGHLIGHTS_VISIBLE: function(state, action) {
    return { visibleHighlights: action.visible };
  },
};

const actions = util.actionTypes(update);

/** Set whether the app is the sidebar */
function setAppIsSidebar(isSidebar) {
  return { type: actions.SET_SIDEBAR, isSidebar: isSidebar };
}

/**
 * Sets whether annotation highlights in connected documents are shown
 * or not.
 */
function setShowHighlights(show) {
  return { type: actions.SET_HIGHLIGHTS_VISIBLE, visible: show };
}

/**
 * Returns true if the app is being used as the sidebar in the annotation
 * client, as opposed to the standalone annotation page or stream views.
 */
function isSidebar(state) {
  return state.isSidebar;
}

module.exports = {
  init: init,
  update: update,
  actions: {
    setAppIsSidebar: setAppIsSidebar,
    setShowHighlights: setShowHighlights,
  },

  selectors: {
    isSidebar,
  },
};
