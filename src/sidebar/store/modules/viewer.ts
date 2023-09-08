import { createStoreModule, makeAction } from '../create-store';

/**
 * This module defines actions and state related to the display mode of the
 * sidebar.
 */

export type State = {
  /**
   * Has the sidebar ever been opened? NB: This is not necessarily the
   * current state of the sidebar, but tracks whether it has ever been open
   */
  sidebarHasOpened: boolean;
};

const initialState: State = {
  sidebarHasOpened: false,
};

const reducers = {
  SET_SIDEBAR_OPENED(state: State, action: { opened: boolean }) {
    if (action.opened === true) {
      // If the sidebar is open, track that it has ever been opened
      return { sidebarHasOpened: true };
    }
    // Otherwise, nothing to do here
    return {};
  },
};

function setSidebarOpened(opened: boolean) {
  return makeAction(reducers, 'SET_SIDEBAR_OPENED', { opened });
}

function hasSidebarOpened(state: State) {
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
