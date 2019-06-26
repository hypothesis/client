'use strict';

const frames = require('../frames');
const createStore = require('../../create-store');

const session = require('../session');
const util = require('../../util');
const unroll = require('../../../../shared/test/util').unroll;

const actions = frames.actions;
const update = util.createReducer(frames.update);
const selectors = frames.selectors;

function init() {
  return Object.assign({}, frames.init(), session.init());
}

describe('sidebar/store/modules/frames', function() {
  let store;

  beforeEach(() => {
    // Setup a store for tests. Note that some of the tests in this module
    // pre-date the `createStore` helper and have not been refactored to use
    // it yet.
    store = createStore([frames]);
  });

  describe('#connectFrame', function() {
    it('adds the frame to the list of connected frames', function() {
      const frame = { uri: 'http://example.com' };
      const state = update(init(), actions.connectFrame(frame));
      assert.deepEqual(selectors.frames(state), [frame]);
    });
  });

  describe('#destroyFrame', function() {
    it('removes the frame from the list of connected frames', function() {
      const frameList = [
        { uri: 'http://example.com' },
        { uri: 'http://example.org' },
      ];
      let state = init();
      frameList.forEach(function(frame) {
        state = update(state, actions.connectFrame(frame));
      });
      assert.deepEqual(selectors.frames(state), frameList);
      const updatedState = update(state, actions.destroyFrame(frameList[0]));
      assert.deepEqual(selectors.frames(updatedState), [frameList[1]]);
    });
  });

  describe('#updateFrameAnnotationFetchStatus', function() {
    it('updates the isAnnotationFetchComplete status of the frame', function() {
      const frame = {
        uri: 'http://example.com',
      };
      const expectedFrame = {
        uri: 'http://example.com',
        isAnnotationFetchComplete: true,
      };
      const connectedState = update(init(), actions.connectFrame(frame));
      const updatedState = update(
        connectedState,
        actions.updateFrameAnnotationFetchStatus(frame.uri, true)
      );
      assert.deepEqual(selectors.frames(updatedState), [expectedFrame]);
    });

    it('does not update the isAnnotationFetchComplete status of the wrong frame', function() {
      const frame = {
        uri: 'http://example.com',
      };
      const connectedState = update(init(), actions.connectFrame(frame));
      const updatedState = update(
        connectedState,
        actions.updateFrameAnnotationFetchStatus(
          'http://anotherexample.com',
          true
        )
      );
      assert.deepEqual(selectors.frames(updatedState), [frame]);
    });
  });

  describe('#mainFrame', () => {
    it('returns `null` if no frames are connected', () => {
      assert.isNull(store.mainFrame());
    });

    [
      {
        frames: [{ id: null, uri: 'https://example.org' }],
        expectedFrame: 0,
      },
      {
        frames: [
          // An iframe which is also connected.
          { id: 'iframe1', uri: 'https://foo.com/' },

          // The top-level frame.
          { id: null, uri: 'https://example.org' },
        ],
        expectedFrame: 1,
      },
    ].forEach(({ frames, expectedFrame }) => {
      it('returns the main frame from the frames connected to the sidebar', () => {
        frames.forEach(frame => store.connectFrame(frame));
        assert.equal(store.mainFrame(), frames[expectedFrame]);
      });
    });
  });

  describe('#searchUris', function() {
    unroll(
      'returns the expected search URIs (#when)',
      function(testCase) {
        let state = init();
        if (testCase.features) {
          state.session.features = testCase.features;
        }
        testCase.frames.forEach(function(frame) {
          state = update(state, actions.connectFrame(frame));
        });
        assert.deepEqual(selectors.searchUris(state), testCase.searchUris);
      },
      [
        {
          when: 'one HTML frame',
          frames: [
            {
              uri: 'https://publisher.org/article.html',
            },
          ],
          searchUris: ['https://publisher.org/article.html'],
        },
        {
          when: 'one PDF frame',
          frames: [
            {
              uri: 'https://publisher.org/article.pdf',
              metadata: {
                documentFingerprint: '1234',
                link: [
                  {
                    href: 'urn:x-pdf:1234',
                  },
                  {
                    // When a document fingerprint is provided, we currently rely on the
                    // host frame to include the original URL of the document in the
                    // `metadata.link` list.
                    //
                    // This may be omitted if the URI is a `file:///` URI.
                    href: 'https://publisher.org/article.pdf?from_meta_link=1',
                  },
                ],
              },
            },
          ],
          searchUris: [
            'urn:x-pdf:1234',
            'https://publisher.org/article.pdf?from_meta_link=1',
          ],
        },
        {
          when: 'multiple HTML frames',
          frames: [
            {
              uri: 'https://publisher.org/article.html',
            },
            {
              uri: 'https://publisher.org/article2.html',
            },
          ],
          searchUris: [
            'https://publisher.org/article.html',
            'https://publisher.org/article2.html',
          ],
        },
        {
          when: 'the document metadata includes a DOI',
          frames: [
            {
              uri: 'https://publisher.org/article.html',
              metadata: {
                link: [
                  {
                    href: 'doi:10.1.1/1234',
                  },
                ],
              },
            },
          ],
          searchUris: ['https://publisher.org/article.html', 'doi:10.1.1/1234'],
        },
      ]
    );
  });
});
