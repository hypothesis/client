import { createStore } from '../../create-store';
import { framesModule } from '../frames';

describe('sidebar/store/modules/frames', () => {
  let store;

  beforeEach(() => {
    // Setup a store for tests.
    store = createStore([framesModule]);
  });

  describe('#connectFrame', () => {
    it('adds first frame to the list of connected frames', () => {
      const frame = { id: 'frameA', uri: 'http://example.com' };
      store.connectFrame(frame);
      assert.deepEqual(store.frames(), [frame]);
    });

    [null, 'frameA'].forEach(frameId => {
      it('replaces existing frame with the same ID', () => {
        const frame = { id: frameId, uri: 'https://example.com/page-1' };
        const updatedFrame = { id: frameId, uri: 'https://example.com/page-2' };

        store.connectFrame(frame);
        store.connectFrame(updatedFrame);

        assert.deepEqual(store.frames(), [updatedFrame]);
      });
    });

    it('appends frame if ID does not match existing frames', () => {
      const frame = { id: null, uri: 'https://example.com/' };
      const subframe = { id: 'frameA', uri: 'https://example.com/an-iframe' };

      store.connectFrame(frame);
      store.connectFrame(subframe);

      assert.deepEqual(store.frames(), [frame, subframe]);
    });
  });

  describe('#destroyFrame', () => {
    it('removes the frame from the list of connected frames', () => {
      const frameList = [
        { id: 'frameA', uri: 'http://example.com' },
        { id: 'frameB', uri: 'http://example.org' },
      ];

      store.connectFrame(frameList[0]);
      store.connectFrame(frameList[1]);
      store.destroyFrame(frameList[0]);

      assert.deepEqual(store.frames(), [frameList[1]]);
    });
  });

  describe('#updateFrameAnnotationFetchStatus', () => {
    it('updates the isAnnotationFetchComplete status of the frame', () => {
      const frame = {
        id: null,
        uri: 'http://example.com',
      };
      const expectedFrame = {
        id: null,
        uri: 'http://example.com',
        isAnnotationFetchComplete: true,
      };
      store.connectFrame(frame);
      store.updateFrameAnnotationFetchStatus(frame.uri, true);
      assert.deepEqual(store.frames(), [expectedFrame]);
    });

    it('does not update the isAnnotationFetchComplete status of the wrong frame', () => {
      const frame = {
        uri: 'http://example.com',
      };
      store.connectFrame(frame);
      store.updateFrameAnnotationFetchStatus('http://anotherexample.com', true);
      assert.deepEqual(store.frames(), [frame]);
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

  describe('#searchUris', () => {
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
            id: 'frameA',
            uri: 'https://publisher.org/article.html',
          },
          {
            id: 'frameB',
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
    ].forEach(testCase => {
      it(testCase.when, () => {
        testCase.frames.forEach(frame => {
          store.connectFrame(frame);
        });
        const firstResults = store.searchUris();
        const secondResults = store.searchUris();
        assert.deepEqual(firstResults, testCase.searchUris);
        // The selector is memoized and should return the same Array reference
        // assuming the list of search URIs hasn't changed
        assert.equal(firstResults, secondResults);
      });
    });
  });

  describe('getContentInfo', () => {
    it('returns data for content info banner', () => {
      const contentInfo = {
        logo: {},
        item: { title: 'Some article' },
        links: {},
      };
      store.setContentInfo(contentInfo);
      assert.deepEqual(store.getContentInfo(), contentInfo);
    });
  });
});
