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
     * e.g. If `activePanelName` were `foobar`, all `SidebarPanel` components
     * with `panelName` of `foobar` would be active, and thus visible.
     *
     */
    activePanelName: null,
  };
}

const update = {
  OPEN_SIDEBAR_PANEL: function(state, action) {
    return { activePanelName: action.panelName };
  },

  CLOSE_SIDEBAR_PANEL: function(state, action) {
    let activePanelName = state.activePanelName;
    if (action.panelName === activePanelName) {
      activePanelName = null;
    }
    return {
      activePanelName,
    };
  },

  TOGGLE_SIDEBAR_PANEL: function(state, action) {
    let activePanelName;
    // Is the panel in question currently the active panel?
    const panelIsActive = state.activePanelName === action.panelName;
    // What state should the panel in question move to next?
    const panelShouldBeActive =
      typeof action.panelState !== 'undefined'
        ? action.panelState
        : !panelIsActive;

    if (panelShouldBeActive) {
      // If the specified panel should be open (active), set it as active
      activePanelName = action.panelName;
    } else if (panelIsActive && !panelShouldBeActive) {
      // If the specified panel is currently open (active), but it shouldn't be anymore
      activePanelName = null;
    } else {
      // This panel is already inactive; do nothing
      activePanelName = state.activePanelName;
    }

    return {
      activePanelName,
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
  return state.sidebarPanels.activePanelName === panelName;
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
