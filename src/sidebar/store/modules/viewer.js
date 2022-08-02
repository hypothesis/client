import { createStoreModule, makeAction } from '../create-store';

/**
 * This module defines actions and state related to the display mode of the
 * sidebar.
 */

const initialState = {
  /**
   * Has the sidebar ever been opened? NB: This is not necessarily the
   * current state of the sidebar, but tracks whether it has ever been open
   */
  sidebarHasOpened: false,
};

/** @typedef {typeof initialState} State */

const reducers = {
  /**
   * @param {State} state
   * @param {{ opened: boolean }} action
   */
  SET_SIDEBAR_OPENED(state, action) {
    if (action.opened === true) {
      // If the sidebar is open, track that it has ever been opened
      return { sidebarHasOpened: true };
    }
    // Otherwise, nothing to do here
    return {};
  },
};

/**
 * @param {boolean} opened - If the sidebar is open
 */
function setSidebarOpened(opened) {
  return makeAction(reducers, 'SET_SIDEBAR_OPENED', { opened });
}

/** @param {State} state */
function hasSidebarOpened(state) {
  return state.sidebarHasOpened;
}

export const viewerModule = createStoreModule(initialState, {
  namespace: 'viewer',
  reducers,
  actionCreators: {
    setSidebarOpened,
  },
  selectors: {
    hasSidebarOpened,
  },
});
