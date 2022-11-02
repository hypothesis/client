import {
  createSelector,
  createSelectorCreator,
  defaultMemoize,
} from 'reselect';
import shallowEqual from 'shallowequal';

import { createStoreModule, makeAction } from '../create-store';

/**
 * @typedef {import('../../../types/annotator').ContentInfoConfig} ContentInfoConfig
 * @typedef {import('../../../types/annotator').DocumentMetadata} DocumentMetadata
 * @typedef {import('../../../types/annotator').SegmentInfo} SegmentInfo
 */

/**
 * @typedef Frame
 * @prop {string|null} id
 *   - Sub-frames will all have a id (frame identifier) set. The main frame's id is always `null`
 * @prop {DocumentMetadata} metadata - Metadata about the document currently loaded in this frame
 * @prop {string} uri - Current primary URI of the document being displayed
 * @prop {boolean} [isAnnotationFetchComplete]
 * @prop {SegmentInfo} [segment] - Information about the section of a document
 *   that is currently loaded. This is for content such as EPUBs, where the
 *   content displayed in a guest frame is only part of the whole document.
 */

const initialState = {
  /** @type {Frame[]} */
  frames: [],

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
   * @param {{ frame: Frame }} action
   */
  CONNECT_FRAME(state, action) {
    const frameIndex = state.frames.findIndex(
      frame => frame.id === action.frame.id
    );
    const newFrames = [...state.frames];
    if (frameIndex !== -1) {
      newFrames[frameIndex] = action.frame;
    } else {
      newFrames.push(action.frame);
    }
    return { frames: newFrames };
  },

  /**
   * @param {State} state
   * @param {{ frame: Frame }} action
   */
  DESTROY_FRAME(state, action) {
    const frames = state.frames.filter(f => f !== action.frame);
    return { frames };
  },

  /**
   * @param {State} state
   * @param {{ uri: string, isAnnotationFetchComplete: boolean }} action
   */
  UPDATE_FRAME_ANNOTATION_FETCH_STATUS(state, action) {
    const frames = state.frames.map(frame => {
      const match = frame.uri && frame.uri === action.uri;
      if (match) {
        return Object.assign({}, frame, {
          isAnnotationFetchComplete: action.isAnnotationFetchComplete,
        });
      } else {
        return frame;
      }
    });
    return { frames };
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
 * Add or replace a frame in the list of connected frames.
 *
 * If a frame exists with the same ID as `frame` it is replaced, otherwise
 * a new frame is added.
 *
 * @param {Frame} frame
 */
function connectFrame(frame) {
  return makeAction(reducers, 'CONNECT_FRAME', { frame });
}

/**
 * Remove a frame from the list of connected frames.
 *
 * @param {Frame} frame
 */
function destroyFrame(frame) {
  return makeAction(reducers, 'DESTROY_FRAME', { frame });
}

/**
 * Update the `isAnnotationFetchComplete` flag of the frame.
 *
 * @param {string} uri
 * @param {boolean} isFetchComplete
 */
function updateFrameAnnotationFetchStatus(uri, isFetchComplete) {
  return makeAction(reducers, 'UPDATE_FRAME_ANNOTATION_FETCH_STATUS', {
    uri,
    isAnnotationFetchComplete: isFetchComplete,
  });
}

/** @param {ContentInfoConfig} info */
function setContentInfo(info) {
  return makeAction(reducers, 'SET_CONTENT_INFO', { info });
}

/**
 * Return the list of frames currently connected to the sidebar app.
 *
 * @param {State} state
 */
function frames(state) {
  return state.frames;
}

/**
 * Return the "main" frame that the sidebar is connected to.
 *
 * The sidebar may be connected to multiple frames from different URLs.
 * For some purposes, the main frame (typically the top-level one that contains
 * the sidebar) needs to be distinguished. This selector returns the main frame
 * for that purpose.
 *
 * This may be `null` during startup.
 */
const mainFrame = createSelector(
  /** @param {State} state */
  state => state.frames,

  // Sub-frames will all have a "frame identifier" set. The main frame is the
  // one with a `null` id.
  frames => frames.find(f => !f.id) || null
);

/**
 * @param {Frame} frame
 */
function searchUrisForFrame(frame) {
  let uris = [frame.uri];

  if (frame.metadata && frame.metadata.documentFingerprint) {
    uris = frame.metadata.link.map(link => {
      return link.href;
    });
  }

  if (frame.metadata && frame.metadata.link) {
    frame.metadata.link.forEach(link => {
      if (link.href.startsWith('doi:')) {
        uris.push(link.href);
      }
    });
  }

  return uris;
}

// "selector creator" that uses `shallowEqual` instead of `===` for memoization
const createShallowEqualSelector = createSelectorCreator(
  defaultMemoize,
  shallowEqual
);

/**
 * Memoized selector will return the same array (of URIs) reference unless the
 * values of the array change (are not shallow-equal).
 */
const searchUris = createShallowEqualSelector(
  /** @param {State} state */
  state =>
    state.frames.reduce(
      (uris, frame) => uris.concat(searchUrisForFrame(frame)),
      /** @type {string[]} */ ([])
    ),
  uris => uris
);

/** @param {State} state */
function getContentInfo(state) {
  return state.contentInfo;
}

export const framesModule = createStoreModule(initialState, {
  namespace: 'frames',
  reducers,

  actionCreators: {
    connectFrame,
    destroyFrame,
    setContentInfo,
    updateFrameAnnotationFetchStatus,
  },

  selectors: {
    getContentInfo,
    frames,
    mainFrame,
    searchUris,
  },
});
