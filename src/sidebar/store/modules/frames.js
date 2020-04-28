import { createSelector } from 'reselect';

import * as util from '../util';

function init() {
  // The list of frames connected to the sidebar app
  return {
    frames: [],
    // A map of frame `uri` => boolean — denotes that annotation fetching is
    // complete for a given frame (by `uri`)
    frameAnnotationFetchStatus: {},
  };
}

const update = {
  CONNECT_FRAME: function (state, action) {
    return { frames: state.frames.concat(action.frame) };
  },

  DESTROY_FRAME: function (state, action) {
    const updatedStatus = { ...state.frames.frameAnnotationFetchStatus };
    delete updatedStatus[action.frame.uri];
    return {
      frames: state.frames.filter(f => f !== action.frame),
      frameAnnotationFetchStatus: updatedStatus,
    };
  },

  UPDATE_FRAME_ANNOTATION_FETCH_STATUS: function (state, action) {
    const updatedStatus = {
      ...state.frameAnnotationFetchStatus,
    };
    updatedStatus[action.uri] = action.isAnnotationFetchComplete;
    return {
      frameAnnotationFetchStatus: updatedStatus,
    };
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
  return state.frames.frames;
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
  state => state.frames.frames,

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

/**
 * Return the set of URIs that should be used to search for annotations on the
 * current page.
 */
const searchUris = createSelector(
  state => state.frames.frames,
  frames => {
    return frames.reduce((uris, frame) => {
      return uris.concat(searchUrisForFrame(frame));
    }, []);
  }
);

// Have the annotations for the frame associated with `uri` finished fetching?
function isFrameFetchComplete(state, uri) {
  if (state.frames.frameAnnotationFetchStatus[uri]) {
    return true;
  }
  return false;
}

// Return fetch status for all known frame URIs
function frameFetchStatus(state) {
  return state.frames.frameAnnotationFetchStatus;
}

export default {
  init: init,
  namespace: 'frames',
  update: update,

  actions: {
    connectFrame,
    destroyFrame,
    updateFrameAnnotationFetchStatus,
  },

  selectors: {
    frames,
    frameFetchStatus,
    isFrameFetchComplete,
    mainFrame,
    searchUris,
  },
};
