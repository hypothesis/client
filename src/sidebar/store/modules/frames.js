import {
  createSelector,
  createSelectorCreator,
  defaultMemoize,
} from 'reselect';
import shallowEqual from 'shallowequal';

import * as util from '../util';

function init() {
  // The list of frames connected to the sidebar app
  return [];
}

const update = {
  CONNECT_FRAME: function (state, action) {
    return [...state, action.frame];
  },

  DESTROY_FRAME: function (state, action) {
    return state.filter(f => f !== action.frame);
  },

  UPDATE_FRAME_ANNOTATION_FETCH_STATUS: function (state, action) {
    const frames = state.map(function (frame) {
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

const actions = util.actionTypes(update);

/**
 * Add a frame to the list of frames currently connected to the sidebar app.
 */
function connectFrame(frame) {
  return { type: actions.CONNECT_FRAME, frame: frame };
}

/**
 * Remove a frame from the list of frames currently connected to the sidebar app.
 */
function destroyFrame(frame) {
  return { type: actions.DESTROY_FRAME, frame: frame };
}

/**
 * Update the `isAnnotationFetchComplete` flag of the frame.
 */
function updateFrameAnnotationFetchStatus(uri, status) {
  return {
    type: actions.UPDATE_FRAME_ANNOTATION_FETCH_STATUS,
    isAnnotationFetchComplete: status,
    uri: uri,
  };
}

/**
 * Return the list of frames currently connected to the sidebar app.
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
  state => state.frames,

  // Sub-frames will all have a "frame identifier" set. The main frame is the
  // one with a `null` id.
  frames => frames.find(f => !f.id) || null
);

function searchUrisForFrame(frame) {
  let uris = [frame.uri];

  if (frame.metadata && frame.metadata.documentFingerprint) {
    uris = frame.metadata.link.map(function (link) {
      return link.href;
    });
  }

  if (frame.metadata && frame.metadata.link) {
    frame.metadata.link.forEach(function (link) {
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

// Memoized selector will return the same array (of URIs) reference unless the
// values of the array change (are not shallow-equal).
const searchUris = createShallowEqualSelector(
  state => {
    return state.frames.reduce(
      (uris, frame) => uris.concat(searchUrisForFrame(frame)),
      []
    );
  },
  uris => uris
);

export default {
  init: init,
  namespace: 'frames',
  update: update,

  actions: {
    connectFrame: connectFrame,
    destroyFrame: destroyFrame,
    updateFrameAnnotationFetchStatus: updateFrameAnnotationFetchStatus,
  },

  selectors: {
    frames,
    mainFrame,
    searchUris,
  },
};
