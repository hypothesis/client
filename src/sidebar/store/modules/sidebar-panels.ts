/**
 * This module handles the state for `SidebarPanel` components used in the app.
 * It keeps track of the "active" `panelName` (simple string) and allows the
 * opening, closing or toggling of panels via their `panelName`. It merely
 * retains the `panelName` state as a string: it has no understanding nor
 * opinions about whether a given `panelName` corresponds to one or more
 * extant `SidebarPanel` components. Only one panel (as keyed by `panelName`)
 * may be "active" (open) at one time.
 */
import type { PanelName } from '../../../types/sidebar';
import { createStoreModule, makeAction } from '../create-store';

export type State = {
  /**
   * The `panelName` of the currently-active sidebar panel.
   * Only one `panelName` may be active at a time, but it is valid (though not
   * the standard use case) for multiple `SidebarPanel` components to share
   * the same `panelName`—`panelName` is not intended as a unique ID/key.
   *
   * e.g. If `activePanelName` were `foobar`, all `SidebarPanel` components
   * with `panelName` of `foobar` would be active, and thus visible.
   */
  activePanelName: PanelName | null;
};

const initialState: State = {
  activePanelName: null,
};

const reducers = {
  OPEN_SIDEBAR_PANEL(state: State, action: { panelName: PanelName }) {
    return { activePanelName: action.panelName };
  },

  CLOSE_SIDEBAR_PANEL(state: State, action: { panelName: PanelName }) {
    let activePanelName = state.activePanelName;
    if (action.panelName === activePanelName) {
      // `action.panelName` is indeed the currently-active panel; deactivate
      activePanelName = null;
    }
    // `action.panelName` is not the active panel; nothing to do here
    return {
      activePanelName,
    };
  },

  TOGGLE_SIDEBAR_PANEL(
    state: State,
    action: { panelName: PanelName; panelState?: boolean },
  ) {
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

/**
 * Designate `panelName` as the currently-active panel name
 */
function openSidebarPanel(panelName: PanelName) {
  return makeAction(reducers, 'OPEN_SIDEBAR_PANEL', { panelName });
}

/**
 * `panelName` should not be the active panel
 */
function closeSidebarPanel(panelName: PanelName) {
  return makeAction(reducers, 'CLOSE_SIDEBAR_PANEL', { panelName });
}

/**
 * Toggle a sidebar panel from its current state, or set it to the
 * designated `panelState`.
 *
 * @param panelState -
 *   Should the panel be active? Omit this prop to simply toggle the value.
 */
function toggleSidebarPanel(panelName: PanelName, panelState?: boolean) {
  return makeAction(reducers, 'TOGGLE_SIDEBAR_PANEL', {
    panelName,
    panelState,
  });
}

/**
 * Is the panel indicated by `panelName` currently active (open)?
 */
function isSidebarPanelOpen(state: State, panelName: PanelName) {
  return state.activePanelName === panelName;
}

export const sidebarPanelsModule = createStoreModule(initialState, {
  namespace: 'sidebarPanels',
  reducers,

  actionCreators: {
    openSidebarPanel,
    closeSidebarPanel,
    toggleSidebarPanel,
  },

  selectors: {
    isSidebarPanelOpen,
  },
});
