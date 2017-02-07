'use strict';

var util = require('./util');

function init() {
  return {
    // The list of frames connected to the sidebar app
    frames: [],
  };
}

var update = {
  CONNECT_FRAME: function (state, action) {
    return {frames: state.frames.concat(action.frame)};
  },

  UPDATE_FRAME_ANNOTATION_FETCH_STATUS: function (state, action) {
    var frames = state.frames.map(function (frame) {
      var match = (frame.uri && frame.uri === action.uri);
      if (match) {
        return Object.assign({}, frame, {
          isAnnotationFetchComplete: action.isAnnotationFetchComplete,
        });
      } else {
        return frame;
      }
    });
    return {
      frames: frames,
    };
  },
};

var actions = util.actionTypes(update);

/**
 * Add a frame to the list of frames currently connected to the sidebar app.
 */
function connectFrame(frame) {
  return {type: actions.CONNECT_FRAME, frame: frame};
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

module.exports = {
  init: init,
  update: update,

  actions: {
    connectFrame: connectFrame,
    updateFrameAnnotationFetchStatus: updateFrameAnnotationFetchStatus,
  },

  // Selectors
  frames: frames,
};
