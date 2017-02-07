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

  describe('#updateFrameAnnotationFetchStatus', function () {
    it('updates the isAnnotationFetchComplete status of the frame', function () {
      var frame = {
        uri: 'http://example.com',
      };
      var expectedFrame = {
        uri: 'http://example.com',
        isAnnotationFetchComplete: true,
      };
      var connectedState = update(init(), actions.connectFrame(frame));
      var updatedState = update(connectedState,
        actions.updateFrameAnnotationFetchStatus(frame.uri, true));
      assert.deepEqual(frames.frames(updatedState), [expectedFrame]);
    });

    it('does not update the isAnnotationFetchComplete status of the wrong frame', function () {
      var frame = {
        uri: 'http://example.com',
      };
      var connectedState = update(init(), actions.connectFrame(frame));
      var updatedState = update(connectedState,
        actions.updateFrameAnnotationFetchStatus('http://anotherexample.com', true));
      assert.deepEqual(frames.frames(updatedState), [frame]);
    });
  });
});
