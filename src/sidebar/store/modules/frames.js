import { createSelector } from 'reselect';
import shallowEqual from 'shallowequal';

import * as util from '../util';
import { createStoreModule } from '../create-store';

/**
 * @typedef {import('../../../types/annotator').DocumentMetadata} DocumentMetadata
 */

/**
 * @typedef Frame
 * @prop {string|null} id
 *   - Sub-frames will all have a id (frame identifier) set. The main frame's id is always `null`
 * @prop {DocumentMetadata} metadata - Metadata about the document currently loaded in this frame
 * @prop {string} uri - Current primary URI of the document being displayed
 * @prop {boolean} [isAnnotationFetchComplete]
 */

/** @type {Frame[]} */
const initialState = [];

/** @typedef {typeof initialState} State */

const reducers = {
  CONNECT_FRAME: function (state, action) {
    return [...state, action.frame];
  },

  DESTROY_FRAME: function (state, action) {
    return state.filter(f => f !== action.frame);
  },

  UPDATE_FRAME_ANNOTATION_FETCH_STATUS: function (state, action) {
    const frames = state.map(frame => {
      const match = frame.uri && frame.uri === action.uri;
      if (match) {
        return Object.assign({}, frame, {
          isAnnotationFetchComplete: action.isAnnotationFetchComplete,
        });
      } else {
        return frame;
      }
    });
    return frames;
  },
};

const actions = util.actionTypes(reducers);

/**
 * Add a frame to the list of frames currently connected to the sidebar app.
 *
 * @param {Frame} frame
 */
function connectFrame(frame) {
  return { type: actions.CONNECT_FRAME, frame };
}

/**
 * Remove a frame from the list of frames currently connected to the sidebar app.
 *
 * @param {Frame} frame
 */
function destroyFrame(frame) {
  return { type: actions.DESTROY_FRAME, frame };
}

/**
 * Update the `isAnnotationFetchComplete` flag of the frame.
 *
 * @param {string} uri
 * @param {boolean} isFetchComplete
 */
function updateFrameAnnotationFetchStatus(uri, isFetchComplete) {
  return {
    type: actions.UPDATE_FRAME_ANNOTATION_FETCH_STATUS,
    isAnnotationFetchComplete: isFetchComplete,
    uri,
  };
}

/**
 * Return the list of frames currently connected to the sidebar app.
 *
 * @return {Frame[]}
 */
function frames(state) {
  return state;
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
  state => state,

  // Sub-frames will all have a "frame identifier" set. The main frame is the
  // one with a `null` id.
  frames => frames.find(f => !f.id) || null
);

/**
 * @param {Pick<Frame, "metadata"|"uri">} frame
 */
function searchURIsForFrame(frame) {
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

/**
 * Return true if two arrays have the same entries in the same order.
 *
 * @template T
 * @param {T[]} a
 * @param {T[]} b
 */
function entriesShallowEqual(a, b) {
  return (
    a.length === b.length && a.every((item, i) => shallowEqual(item, b[i]))
  );
}

/**
 * Return a map of frame ID to search URIs.
 *
 * The returned map's identity will change only if the set of frames or
 * URIs for those frames changes.
 */
const searchURIMap = createSelector(
  // Extract only fields of frames which may affect search URIs.
  /** @param {State} frames */
  frames => frames.map(f => ({ id: f.id, uri: f.uri, metadata: f.metadata })),
  frames => {
    /** @type {Map<string|null, string[]>} */
    const uriMap = new Map();
    for (let frame of frames) {
      uriMap.set(frame.id, searchURIsForFrame(frame));
    }
    return uriMap;
  },
  {
    memoizeOptions: {
      equalityCheck: entriesShallowEqual,
    },
  }
);

export const framesModule = createStoreModule(initialState, {
  namespace: 'frames',
  reducers,

  actionCreators: {
    connectFrame,
    destroyFrame,
    updateFrameAnnotationFetchStatus,
  },

  selectors: {
    frames,
    mainFrame,
    searchURIMap,
  },
});
