'use strict';

const util = require('../util');

function init() {
  return {
    /*
     * The `panelName` of the currently-active sidebar panel.
     * Only one `panelName` may be active at a time, but it is valid (though not
     * the standard use case) for multiple `SidebarPanel` components to share
     * the same `panelName`—`panelName` is not intended as a unique ID/key.
     *
     * e.g. If `activeSidebarPanel` were `foobar`, all `SidebarPanel` components
     * with `panelName` of `foobar` would be active, and thus visible.
     *
     */
    activeSidebarPanel: null,
  };
}

const update = {
  OPEN_SIDEBAR_PANEL: function(state, action) {
    return { activeSidebarPanel: action.panelName };
  },

  CLOSE_SIDEBAR_PANEL: function(state, action) {
    let activeSidebarPanel = state.activeSidebarPanel;
    if (action.panelName === activeSidebarPanel) {
      activeSidebarPanel = null;
    }
    return {
      activeSidebarPanel,
    };
  },

  TOGGLE_SIDEBAR_PANEL: function(state, action) {
    let activeSidebarPanel;
    // Is the panel in question currently the active panel?
    const panelIsActive = state.activeSidebarPanel === action.panelName;
    // What state should the panel in question move to next?
    const panelShouldBeActive =
      typeof action.panelState !== 'undefined'
        ? action.panelState
        : !panelIsActive;

    if (panelShouldBeActive) {
      // If the specified panel should be open (active), set it as active
      activeSidebarPanel = action.panelName;
    } else if (panelIsActive && !panelShouldBeActive) {
      // If the specified panel is currently open (active), but it shouldn't be anymore
      activeSidebarPanel = null;
    } else {
      // This panel is already inactive; do nothing
      activeSidebarPanel = state.activeSidebarPanel;
    }

    return {
      activeSidebarPanel,
    };
  },
};

const actions = util.actionTypes(update);

/**
 * Designate `panelName` as the currently-active panel name
 */
function openSidebarPanel(panelName) {
  return { type: actions.OPEN_SIDEBAR_PANEL, panelName: panelName };
}

/**
 * `panelName` should not be the active panel
 */
function closeSidebarPanel(panelName) {
  return { type: actions.CLOSE_SIDEBAR_PANEL, panelName: panelName };
}

/**
 * Toggle a sidebar panel from its current state, or set it to the
 * designated `panelState`
 *
 * @param {String} panelName
 * @param {Boolean} panelState - Should the panel be active?
 */
function toggleSidebarPanel(panelName, panelState) {
  return {
    type: actions.TOGGLE_SIDEBAR_PANEL,
    panelName: panelName,
    panelState: panelState,
  };
}

/**
 * Is the panel indicated by `panelName` currently active (open)?
 *
 * @param {String} panelName
 * @return {Boolean} - `true` if `panelName` is the currently-active panel
 */
function isSidebarPanelOpen(state, panelName) {
  return state.sidebarPanels.activeSidebarPanel === panelName;
}

module.exports = {
  namespace: 'sidebarPanels',
  init: init,
  update: update,

  actions: {
    openSidebarPanel,
    closeSidebarPanel,
    toggleSidebarPanel,
  },

  selectors: {
    isSidebarPanelOpen,
  },
};
