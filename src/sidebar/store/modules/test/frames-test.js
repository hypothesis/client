'use strict';

var frames = require('../frames');
var session = require('../session');
var util = require('../../util');
var unroll = require('../../../../shared/test/util').unroll;

var actions = frames.actions;
var update = util.createReducer(frames.update);
var selectors = frames.selectors;

function init() {
  return Object.assign({}, frames.init(), session.init());
}

describe('sidebar.reducers.frames', function () {
  describe('#connectFrame', function () {
    it('adds the frame to the list of connected frames', function () {
      var frame = {uri: 'http://example.com'};
      var state = update(init(), actions.connectFrame(frame));
      assert.deepEqual(selectors.frames(state), [frame]);
    });
  });

  describe('#destroyFrame', function () {
    it('removes the frame from the list of connected frames', function () {
      var frameList = [{uri: 'http://example.com'}, {uri: 'http://example.org'}];
      var state = init();
      frameList.forEach(function (frame) {
        state = update(state, actions.connectFrame(frame));
      });
      assert.deepEqual(selectors.frames(state), frameList);
      var updatedState = update(state, actions.destroyFrame(frameList[0]));
      assert.deepEqual(selectors.frames(updatedState), [frameList[1]]);
    });
  });

  describe('#updateFrame', () => {
    it('updates the metadata and URI of frames with a matching ID', () => {
      var frameList = [{
        id: null,
        uri: 'http://example.com',
        metadata: {
          title: 'First Page',
        },
      }];
      var state = init();
      frameList.forEach(frame => state = update(state, actions.connectFrame(frame)));

      var metadata = { title: 'Second Page' };
      var uri = 'http://example.com/foo';
      var updatedState = update(state, actions.updateFrame({ id: null, uri, metadata }));

      assert.deepEqual(selectors.frames(updatedState), [{ id: null, uri, metadata }]);
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
      assert.deepEqual(selectors.frames(updatedState), [expectedFrame]);
    });

    it('does not update the isAnnotationFetchComplete status of the wrong frame', function () {
      var frame = {
        uri: 'http://example.com',
      };
      var connectedState = update(init(), actions.connectFrame(frame));
      var updatedState = update(connectedState,
        actions.updateFrameAnnotationFetchStatus('http://anotherexample.com', true));
      assert.deepEqual(selectors.frames(updatedState), [frame]);
    });
  });

  describe('#searchUris', function () {
    unroll('returns the expected search URIs (#when)', function (testCase) {
      var state = init();
      if (testCase.features) {
        state.session.features = testCase.features;
      }
      testCase.frames.forEach(function (frame) {
        state = update(state, actions.connectFrame(frame));
      });
      assert.deepEqual(selectors.searchUris(state), testCase.searchUris);
    },[{
      when: 'one HTML frame',
      frames: [{
        uri: 'https://publisher.org/article.html',
      }],
      searchUris: ['https://publisher.org/article.html'],
    },{
      when: 'one PDF frame',
      frames: [{
        uri: 'https://publisher.org/article.pdf',
        metadata: {
          documentFingerprint: '1234',
          link: [{
            href: 'urn:x-pdf:1234',
          },{
            // When a document fingerprint is provided, we currently rely on the
            // host frame to include the original URL of the document in the
            // `metadata.link` list.
            //
            // This may be omitted if the URI is a `file:///` URI.
            href: 'https://publisher.org/article.pdf?from_meta_link=1',
          }],
        },
      }],
      searchUris: [
        'urn:x-pdf:1234',
        'https://publisher.org/article.pdf?from_meta_link=1',
      ],
    },{
      when: 'multiple HTML frames',
      frames: [{
        uri: 'https://publisher.org/article.html',
      },{
        uri: 'https://publisher.org/article2.html',
      }],
      searchUris: [
        'https://publisher.org/article.html',
        'https://publisher.org/article2.html',
      ],
    },{
      when: 'the document metadata includes a DOI',
      frames: [{
        uri: 'https://publisher.org/article.html',
        metadata: {
          link: [{
            href: 'doi:10.1.1/1234',
          }],
        },
      }],
      searchUris: [
        'https://publisher.org/article.html',
        'doi:10.1.1/1234',
      ],
    }]);
  });
});
