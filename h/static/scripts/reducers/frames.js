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
};

var actions = util.actionTypes(update);

/**
 * Add a frame to the list of frames currently connected to the sidebar app.
 */
function connectFrame(frame) {
  return {type: actions.CONNECT_FRAME, frame: frame};
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
  },

  // Selectors
  frames: frames,
};
