import { createStoreModule, makeAction } from '../create-store';

/**
 * @typedef {import('../../../types/annotator').ContentInfoConfig} ContentInfoConfig
 */

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

  /**
   * Data for the content information banner shown above the content in the main
   * guest frame.
   *
   * @type {ContentInfoConfig|null}
   */
  contentInfo: null,
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

  /**
   * @param {State} state
   * @param {{ info: ContentInfoConfig }} action
   */
  SET_CONTENT_INFO(state, action) {
    return { contentInfo: action.info };
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

/** @param {ContentInfoConfig} info */
function setContentInfo(info) {
  return makeAction(reducers, 'SET_CONTENT_INFO', { info });
}

/** @param {State} state */
function getContentInfo(state) {
  return state.contentInfo;
}

export const viewerModule = createStoreModule(initialState, {
  namespace: 'viewer',
  reducers,
  actionCreators: {
    setContentInfo,
    setSidebarOpened,
  },
  selectors: {
    getContentInfo,
    hasSidebarOpened,
  },
});
