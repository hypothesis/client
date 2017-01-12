'use strict';

var frames = require('../frames');
var util = require('../util');

var init = frames.init;
var actions = frames.actions;
var update = util.createReducer(frames.update);

describe('frames reducer', function () {
  describe('#connectFrame', function () {
    it('adds the frame to the list of connected frames', function () {
      var frame = {uri: 'http://example.com'};
      var state = update(init(), actions.connectFrame(frame));
      assert.deepEqual(frames.frames(state), [frame]);
    });
  });
});
