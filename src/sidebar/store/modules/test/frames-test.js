import createStore from '../../create-store';
import frames from '../frames';

describe('sidebar/store/modules/frames', function () {
  let store;

  beforeEach(() => {
    // Setup a store for tests.
    store = createStore([frames]);
  });

  describe('actions', () => {
    describe('#connectFrame', () => {
      it('adds the frame to the list of connected frames', () => {
        const frame = { uri: 'http://example.com' };
        store.connectFrame(frame);
        assert.deepEqual(store.frames(), [frame]);
      });
    });

    describe('#destroyFrame', () => {
      it('removes the frame from the list of connected frames', () => {
        const frameList = [
          { uri: 'http://example.com' },
          { uri: 'http://example.org' },
        ];
        store.connectFrame(frameList[0]);
        store.updateFrameAnnotationFetchStatus(frameList[0].uri, true);
        store.connectFrame(frameList[1]);
        store.destroyFrame(frameList[0]);
        assert.deepEqual(store.frames(), [frameList[1]]);
        assert.isFalse(store.isFrameFetchComplete(frameList[0].uri));
      });
    });

    describe('#updateFrameAnnotationFetchStatus', () => {
      it('updates the annotation-fetch status for the associated URI', () => {
        const fakeUri = 'http://example.com';
        store.connectFrame({ uri: fakeUri });
        store.updateFrameAnnotationFetchStatus(fakeUri, true);
        assert.isTrue(store.isFrameFetchComplete(fakeUri));
      });

      it('does not affect other the annotation-fetch status for other frames', () => {
        store.connectFrame({ uri: 'http://example.com' });
        store.connectFrame({ uri: 'http://example.org' });
        store.updateFrameAnnotationFetchStatus('http://example.com', false);
        store.updateFrameAnnotationFetchStatus('http://example.org', true);

        assert.isFalse(store.isFrameFetchComplete('http://example.com'));
      });
    });
  });

  describe('selectors', () => {
    describe('#frameFetchStatus', () => {
      it('should return the annotation-fetch status for all frames that have set status', () => {
        store.updateFrameAnnotationFetchStatus('http://www.example.com', true);
        store.updateFrameAnnotationFetchStatus('http://www.example.org', false);

        assert.deepEqual(store.frameFetchStatus(), {
          'http://www.example.com': true,
          'http://www.example.org': false,
        });
      });
    });

    describe('#isFrameFetchComplete', () => {
      beforeEach(() => {
        store.updateFrameAnnotationFetchStatus('http://www.example.com', true);
        store.updateFrameAnnotationFetchStatus('http://www.example.org', false);
      });

      it('should return the boolean fetch-complete value for a given URI', () => {
        assert.isTrue(store.isFrameFetchComplete('http://www.example.com'));
        assert.isFalse(store.isFrameFetchComplete('http://www.example.org'));
      });

      it('should return `false` if no fetch status available for URI', () => {
        assert.isFalse(store.isFrameFetchComplete('some rando URI'));
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
      ].forEach(testCase => {
        it(testCase.when, () => {
          testCase.frames.forEach(frame => {
            store.connectFrame(frame);
          });
          assert.deepEqual(store.searchUris(), testCase.searchUris);
        });
      });
    });
  });
});
