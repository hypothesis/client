'use strict';

const annotationMetadata = require('../annotation-metadata');
const fixtures = require('../../test/annotation-fixtures');

const unroll = require('../../../shared/test/util').unroll;

const documentMetadata = annotationMetadata.documentMetadata;
const domainAndTitle = annotationMetadata.domainAndTitle;

describe('annotation-metadata', function() {
  describe('.documentMetadata', function() {
    context('when the model has a document property', function() {
      it('returns the hostname from model.uri as the domain', function() {
        const model = {
          document: {},
          uri: 'http://example.com/',
        };

        assert.equal(documentMetadata(model).domain, 'example.com');
      });

      context('when model.uri does not start with "urn"', function() {
        it('uses model.uri as the uri', function() {
          const model = {
            document: {},
            uri: 'http://example.com/',
          };

          assert.equal(documentMetadata(model).uri, 'http://example.com/');
        });
      });

      context('when document.title is an available', function() {
        it('uses the first document title as the title', function() {
          const model = {
            uri: 'http://example.com/',
            document: {
              title: ['My Document', 'My Other Document'],
            },
          };

          assert.equal(documentMetadata(model).title, model.document.title[0]);
        });
      });

      context('when there is no document.title', function() {
        it('returns the domain as the title', function() {
          const model = {
            document: {},
            uri: 'http://example.com/',
          };

          assert.equal(documentMetadata(model).title, 'example.com');
        });
      });
    });

    context('when the model does not have a document property', function() {
      it('returns model.uri for the uri', function() {
        const model = { uri: 'http://example.com/' };

        assert.equal(documentMetadata(model).uri, model.uri);
      });

      it('returns the hostname of model.uri for the domain', function() {
        const model = { uri: 'http://example.com/' };

        assert.equal(documentMetadata(model).domain, 'example.com');
      });

      it('returns the hostname of model.uri for the title', function() {
        const model = { uri: 'http://example.com/' };

        assert.equal(documentMetadata(model).title, 'example.com');
      });
    });
  });

  describe('.domainAndTitle', function() {
    context('when an annotation has a non-http(s) uri', function() {
      it('returns no title link', function() {
        const model = {
          uri: 'file:///example.pdf',
        };

        assert.equal(domainAndTitle(model).titleLink, null);
      });
    });

    context('when an annotation has a direct link', function() {
      it('returns the direct link as a title link', function() {
        const model = {
          uri: 'https://annotatedsite.com/',
          links: {
            incontext: 'https://example.com',
          },
        };

        assert.equal(domainAndTitle(model).titleLink, 'https://example.com');
      });
    });

    context(
      'when an annotation has no direct link but has a http(s) uri',
      function() {
        it('returns the uri as title link', function() {
          const model = {
            uri: 'https://example.com',
          };

          assert.equal(domainAndTitle(model).titleLink, 'https://example.com');
        });
      }
    );

    context(
      'when the annotation title is shorter than 30 characters',
      function() {
        it('returns the annotation title as title text', function() {
          const model = {
            uri: 'https://annotatedsite.com/',
            document: {
              title: ['A Short Document Title'],
            },
          };

          assert.equal(
            domainAndTitle(model).titleText,
            'A Short Document Title'
          );
        });
      }
    );

    context(
      'when the annotation title is longer than 30 characters',
      function() {
        it('truncates the title text with "…"', function() {
          const model = {
            uri: 'http://example.com/',
            document: {
              title: ['My Really Really Long Document Title'],
            },
          };

          assert.equal(
            domainAndTitle(model).titleText,
            'My Really Really Long Document…'
          );
        });
      }
    );

    context('when the document uri refers to a filename', function() {
      it('returns the filename as domain text', function() {
        const model = {
          uri: 'file:///path/to/example.pdf',
          document: {
            title: ['Document Title'],
          },
        };

        assert.equal(domainAndTitle(model).domain, 'example.pdf');
      });
    });

    context('when domain and title are the same', function() {
      it('returns an empty domain text string', function() {
        const model = {
          uri: 'https://example.com',
          document: {
            title: ['example.com'],
          },
        };

        assert.equal(domainAndTitle(model).domain, '');
      });
    });

    context('when the document has no domain', function() {
      it('returns an empty domain text string', function() {
        const model = {
          uri: 'doi:10.1234/5678',
          document: {
            title: ['example.com'],
          },
        };

        assert.equal(domainAndTitle(model).domain, '');
      });
    });

    context('when the document is a local file with a title', function() {
      it('returns the filename', function() {
        const model = {
          uri: 'file:///home/seanh/MyFile.pdf',
          document: {
            title: ['example.com'],
          },
        };

        assert.equal(domainAndTitle(model).domain, 'MyFile.pdf');
      });
    });
  });

  describe('.location', function() {
    it('returns the position for annotations with a text position', function() {
      assert.equal(
        annotationMetadata.location({
          target: [
            {
              selector: [
                {
                  type: 'TextPositionSelector',
                  start: 100,
                },
              ],
            },
          ],
        }),
        100
      );
    });

    it('returns +ve infinity for annotations without a text position', function() {
      assert.equal(
        annotationMetadata.location({
          target: [
            {
              selector: undefined,
            },
          ],
        }),
        Number.POSITIVE_INFINITY
      );
    });
  });

  describe('.isPageNote', function() {
    it('returns true for an annotation with an empty target', function() {
      assert.isTrue(
        annotationMetadata.isPageNote({
          target: [],
        })
      );
    });
    it('returns true for an annotation without selectors', function() {
      assert.isTrue(
        annotationMetadata.isPageNote({
          target: [{ selector: undefined }],
        })
      );
    });
    it('returns true for an annotation without a target', function() {
      assert.isTrue(
        annotationMetadata.isPageNote({
          target: undefined,
        })
      );
    });
    it('returns false for an annotation which is a reply', function() {
      assert.isFalse(
        annotationMetadata.isPageNote({
          target: [],
          references: ['xyz'],
        })
      );
    });
  });

  describe('.isAnnotation', function() {
    it('returns true if an annotation is a top level annotation', function() {
      assert.isTrue(
        annotationMetadata.isAnnotation({
          target: [{ selector: [] }],
        })
      );
    });
    it('returns false if an annotation has no target', function() {
      assert.isFalse(annotationMetadata.isAnnotation({}));
    });
  });

  describe('.isPublic', function() {
    it('returns true if an annotation is shared within a group', function() {
      assert.isTrue(annotationMetadata.isPublic(fixtures.publicAnnotation()));
    });

    unroll(
      'returns false if an annotation is not publicly readable',
      function(testCase) {
        const annotation = Object.assign(fixtures.defaultAnnotation(), {
          permissions: testCase,
        });
        assert.isFalse(annotationMetadata.isPublic(annotation));
      },
      [
        {
          read: ['acct:someemail@localhost'],
        },
        {
          read: ['something invalid'],
        },
      ]
    );

    it('returns false if an annotation is missing permissions', function() {
      assert.isFalse(annotationMetadata.isPublic(fixtures.defaultAnnotation()));
    });
  });

  describe('.isOrphan', function() {
    it('returns true if an annotation failed to anchor', function() {
      const annotation = Object.assign(fixtures.defaultAnnotation(), {
        $orphan: true,
      });
      assert.isTrue(annotationMetadata.isOrphan(annotation));
    });

    it('returns false if an annotation successfully anchored', function() {
      const orphan = Object.assign(fixtures.defaultAnnotation(), {
        $orphan: false,
      });
      assert.isFalse(annotationMetadata.isOrphan(orphan));
    });
  });

  describe('.isWaitingToAnchor', function() {
    const isWaitingToAnchor = annotationMetadata.isWaitingToAnchor;

    it('returns true for annotations that are not yet anchored', function() {
      assert.isTrue(isWaitingToAnchor(fixtures.defaultAnnotation()));
    });

    it('returns false for annotations that are anchored', function() {
      const anchored = Object.assign({}, fixtures.defaultAnnotation(), {
        $orphan: false,
      });
      assert.isFalse(isWaitingToAnchor(anchored));
    });

    it('returns false for annotations that failed to anchor', function() {
      const anchored = Object.assign({}, fixtures.defaultAnnotation(), {
        $orphan: true,
      });
      assert.isFalse(isWaitingToAnchor(anchored));
    });

    it('returns false for replies', function() {
      assert.isFalse(isWaitingToAnchor(fixtures.oldReply()));
    });

    it('returns false for page notes', function() {
      assert.isFalse(isWaitingToAnchor(fixtures.oldPageNote()));
    });

    it('returns false if the anchoring timeout flag was set', function() {
      const pending = Object.assign({}, fixtures.defaultAnnotation(), {
        $anchorTimeout: true,
      });
      assert.isFalse(isWaitingToAnchor(pending));
    });
  });

  describe('.flagCount', function() {
    const flagCount = annotationMetadata.flagCount;

    it('returns `null` if the user is not a moderator', function() {
      assert.equal(flagCount(fixtures.defaultAnnotation()), null);
    });

    it('returns the flag count if present', function() {
      const ann = fixtures.moderatedAnnotation({ flagCount: 10 });
      assert.equal(flagCount(ann), 10);
    });
  });
});
