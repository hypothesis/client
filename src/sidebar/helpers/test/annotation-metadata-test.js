import * as fixtures from '../../test/annotation-fixtures';
import * as annotationMetadata from '../annotation-metadata';
import {
  cfi,
  description,
  isSaved,
  pageLabel,
  shape,
} from '../annotation-metadata';

describe('sidebar/helpers/annotation-metadata', () => {
  const fakeAnnotation = (props = {}) => {
    return {
      document: {},
      uri: 'http://example.com/a/page',
      ...props,
    };
  };

  describe('location', () => {
    [
      // TextPositionSelector
      {
        selectors: [
          {
            type: 'TextPositionSelector',
            start: 100,
          },
        ],
        expected: {
          charOffset: 100,
        },
      },

      // EPUBContentSelector
      {
        selectors: [
          {
            type: 'EPUBContentSelector',
            cfi: '/2/4',
            url: 'content/chapter2.xhtml',
          },
        ],
        expected: {
          cfi: '/2/4',
        },
      },

      // PageSelector
      {
        selectors: [
          {
            type: 'PageSelector',
            index: 2,
          },
        ],
        expected: {
          pageIndex: 2,
        },
      },

      // ShapeSelector with rect shape
      {
        selectors: [
          {
            type: 'ShapeSelector',
            shape: {
              type: 'rect',
              top: 100,
            },
            view: {
              top: 10,
            },
          },
        ],
        expected: {
          top: 90,
        },
      },

      // ShapeSelector with point shape
      {
        selectors: [
          {
            type: 'ShapeSelector',
            shape: {
              type: 'point',
              y: 100,
            },
            view: {
              top: 10,
            },
          },
        ],
        expected: {
          top: 90,
        },
      },

      // ShapeSelector with unsupported shape
      {
        selectors: [
          {
            type: 'ShapeSelector',
            shape: {
              type: 'circle',
              centerY: 100,
            },
          },
        ],
        expected: {},
      },

      // ShapeSelector with no viewport information
      {
        selectors: [
          {
            type: 'ShapeSelector',
            shape: {
              type: 'point',
              y: 100,
            },
          },
        ],
        expected: {
          top: 100,
        },
      },

      // All selectors
      {
        selectors: [
          {
            type: 'TextPositionSelector',
            start: 100,
          },
          {
            type: 'EPUBContentSelector',
            cfi: '/2/4',
            url: 'content/chapter2.xhtml',
          },
          {
            type: 'PageSelector',
            index: 1,
          },
          {
            type: 'ShapeSelector',
            shape: {
              type: 'point',
              y: 100,
            },
            view: {
              top: 10,
            },
          },
        ],
        expected: {
          charOffset: 100,
          cfi: '/2/4',
          pageIndex: 1,
          top: 90,
        },
      },
      // No selectors
      {
        selectors: [],
        expected: {},
      },
    ].forEach(({ selectors, expected }) => {
      it('returns location key', () => {
        const loc = annotationMetadata.location({
          target: [{ selector: selectors }],
        });

        // Compare only defined fields
        for (const field of Object.keys(loc)) {
          if (loc[field] === undefined) {
            delete loc[field];
          }
        }

        assert.deepEqual(loc, expected);
      });
    });

    it('returns empty object if annotation has empty target list', () => {
      const loc = annotationMetadata.location({ target: [] });
      assert.deepEqual(loc, {});
    });
  });

  describe('isHighlight', () => {
    [
      {
        annotation: fixtures.newEmptyAnnotation(),
        expect: false,
        desc: 'new, empty annotation',
      },
      {
        annotation: fixtures.newReply(),
        expect: false,
        desc: 'new, reply annotation',
      },
      {
        annotation: fixtures.newAnnotation(),
        expect: false,
        desc: 'new, with some text',
      },
      {
        annotation: fixtures.newHighlight(),
        expect: true,
        desc: 'new, marked as $highlight',
      },
      {
        annotation: fixtures.oldAnnotation(),
        expect: false,
        desc: 'pre-existing annotation',
      },
      {
        annotation: fixtures.oldHighlight(),
        expect: true,
        desc: 'pre-existing higlight',
      },
      {
        annotation: fixtures.oldPageNote(),
        expect: false,
        desc: 'pre-existing page note',
      },
      {
        annotation: fixtures.oldReply(),
        expect: false,
        desc: 'pre-existing reply',
      },
    ].forEach(testcase => {
      it(`returns ${testcase.expect} for isHighlight when annotation is: ${testcase.desc}`, () => {
        assert.equal(
          annotationMetadata.isHighlight(testcase.annotation),
          testcase.expect,
        );
      });
    });
  });

  describe('isPageNote', () => {
    it('returns true for an annotation with an empty target', () => {
      assert.isTrue(
        annotationMetadata.isPageNote({
          target: [],
        }),
      );
    });

    it('returns true for an annotation without selectors', () => {
      assert.isTrue(
        annotationMetadata.isPageNote({
          target: [{ selector: undefined }],
        }),
      );
    });

    it('returns true for an annotation without a target', () => {
      assert.isTrue(
        annotationMetadata.isPageNote({
          target: undefined,
        }),
      );
    });

    it('returns false for an annotation which is a reply', () => {
      assert.isFalse(
        annotationMetadata.isPageNote({
          target: [],
          references: ['xyz'],
        }),
      );
    });
  });

  describe('isAnnotation', () => {
    it('returns true if an annotation is a top level annotation', () => {
      assert.isTrue(
        annotationMetadata.isAnnotation({
          target: [{ selector: [] }],
        }),
      );
    });

    it('returns false if an annotation has no target', () => {
      assert.isFalse(annotationMetadata.isAnnotation({}));
    });
  });

  describe('annotationRole', () => {
    it('correctly identifies the role of an annotation', () => {
      // An annotation needs a `selector` or else it will be identified as a
      // 'Page note'
      const annotationAnnotation = {
        ...fixtures.newAnnotation(),
        target: [{ source: 'source', selector: [] }],
      };
      const highlightAnnotation = fixtures.oldHighlight();
      const pageNoteAnnotation = fixtures.newPageNote();

      // If an annotation is a reply of any sort, that will supersede.
      // e.g. the label for a page note that is also a reply is "Reply"
      // In practice, highlights are never replies.
      const replyAnnotations = [
        { ...annotationAnnotation, references: ['parent_annotation_id'] },
        { ...highlightAnnotation, references: ['parent_annotation_id'] },
        { ...pageNoteAnnotation, references: ['parent_annotation_id'] },
        fixtures.oldReply(),
      ];
      assert.equal(
        annotationMetadata.annotationRole(annotationAnnotation),
        'Annotation',
      );

      assert.equal(
        annotationMetadata.annotationRole(highlightAnnotation),
        'Highlight',
      );

      assert.equal(
        annotationMetadata.annotationRole(pageNoteAnnotation),
        'Page note',
      );

      replyAnnotations.forEach(reply => {
        assert.equal(annotationMetadata.annotationRole(reply), 'Reply');
      });
    });
  });

  describe('isOrphan', () => {
    it('returns true if an annotation failed to anchor', () => {
      const annotation = Object.assign(fixtures.defaultAnnotation(), {
        $orphan: true,
      });
      assert.isTrue(annotationMetadata.isOrphan(annotation));
    });

    it('returns false if an annotation successfully anchored', () => {
      const orphan = Object.assign(fixtures.defaultAnnotation(), {
        $orphan: false,
      });
      assert.isFalse(annotationMetadata.isOrphan(orphan));
    });
  });

  describe('isWaitingToAnchor', () => {
    const isWaitingToAnchor = annotationMetadata.isWaitingToAnchor;

    it('returns true for annotations that are not yet anchored', () => {
      assert.isTrue(isWaitingToAnchor(fixtures.defaultAnnotation()));
    });

    it('returns false for annotations that are anchored', () => {
      const anchored = Object.assign({}, fixtures.defaultAnnotation(), {
        $orphan: false,
      });
      assert.isFalse(isWaitingToAnchor(anchored));
    });

    it('returns false for annotations that failed to anchor', () => {
      const anchored = Object.assign({}, fixtures.defaultAnnotation(), {
        $orphan: true,
      });
      assert.isFalse(isWaitingToAnchor(anchored));
    });

    it('returns false for replies', () => {
      assert.isFalse(isWaitingToAnchor(fixtures.oldReply()));
    });

    it('returns false for page notes', () => {
      assert.isFalse(isWaitingToAnchor(fixtures.oldPageNote()));
    });

    it('returns false if the anchoring timeout flag was set', () => {
      const pending = Object.assign({}, fixtures.defaultAnnotation(), {
        $anchorTimeout: true,
      });
      assert.isFalse(isWaitingToAnchor(pending));
    });
  });

  describe('isSaved', () => {
    it('returns true for saved annotations', () => {
      assert.isTrue(isSaved(fixtures.defaultAnnotation()));
    });

    it('returns false for unsaved annotations', () => {
      assert.isFalse(isSaved(fixtures.newAnnotation()));
    });
  });

  describe('flagCount', () => {
    const flagCount = annotationMetadata.flagCount;

    it('returns `null` if the user is not a moderator', () => {
      assert.equal(flagCount(fixtures.defaultAnnotation()), null);
    });

    it('returns the flag count if present', () => {
      const ann = fixtures.moderatedAnnotation({ flagCount: 10 });
      assert.equal(flagCount(ann), 10);
    });
  });

  describe('quote', () => {
    it('returns quote if annotation has a quote', () => {
      const ann = {
        target: [
          {
            source: 'https://publisher.org/article.pdf',
            selector: [{ type: 'TextQuoteSelector', exact: 'expected quote' }],
          },
        ],
      };
      assert.equal(annotationMetadata.quote(ann), 'expected quote');
    });

    // FIXME - This currently happens when creating a new Page Note. Annotations
    // from the API should always have a target.
    //
    // See https://github.com/hypothesis/client/issues/1290.
    it('returns `null` if annotation has an empty target array', () => {
      const ann = { target: [] };
      assert.equal(annotationMetadata.quote(ann), null);
    });

    it('returns `null` if annotation has no selectors', () => {
      const ann = {
        target: [
          {
            source: 'https://publisher.org/article.pdf',
          },
        ],
      };
      assert.equal(annotationMetadata.quote(ann), null);
    });

    it('returns `null` if annotation has no text quote selector', () => {
      const ann = {
        target: [
          {
            source: 'https://publisher.org/article.pdf',
            selector: [{ type: 'TextPositionSelector', start: 0, end: 100 }],
          },
        ],
      };
      assert.equal(annotationMetadata.quote(ann), null);
    });
  });

  describe('shape', () => {
    [
      {
        selectors: [],
        expected: null,
      },
      {
        selectors: [
          {
            type: 'ShapeSelector',
            shape: {
              type: 'rect',
              left: 0,
              top: 10,
              right: 10,
              bottom: 0,
            },
          },
        ],
        expected: {
          type: 'ShapeSelector',
          shape: {
            type: 'rect',
            left: 0,
            top: 10,
            right: 10,
            bottom: 0,
          },
        },
      },
    ].forEach(({ selectors, expected }) => {
      it('returns shape selector', () => {
        const annotation = {
          target: [
            {
              source: 'https://example.org/dummy.pdf',
              selector: selectors,
            },
          ],
        };
        const annShape = shape(annotation);
        assert.deepEqual(annShape, expected);
      });
    });
  });

  describe('description', () => {
    it('returns target description', () => {
      const annotation = { target: [] };
      assert.isUndefined(description(annotation));

      const annotation2 = {
        target: [
          {
            description: 'Two roads diverge in a wood',
          },
        ],
      };
      assert.equal(description(annotation2), 'Two roads diverge in a wood');
    });
  });

  describe('pageLabel', () => {
    it('returns page label for annotation', () => {
      const ann = {
        target: [
          {
            source: 'https://publisher.org/article.pdf',
            selector: [{ type: 'PageSelector', index: 10, label: '11' }],
          },
        ],
      };
      assert.equal(pageLabel(ann), '11');
    });

    it('returns undefined if annotation has no `PageSelector` selector', () => {
      const anns = [fixtures.newPageNote(), fixtures.newAnnotation()];
      for (const ann of anns) {
        assert.isUndefined(pageLabel(ann));
      }
    });
  });

  describe('cfi', () => {
    it('returns CFI for annotation', () => {
      const ann = {
        target: [
          {
            source: 'https://publisher.org/article.pdf',
            selector: [{ type: 'EPUBContentSelector', cfi: '/2/4' }],
          },
        ],
      };
      assert.equal(cfi(ann), '/2/4');
    });

    it('returns undefined if annotation has no `EPUBContentSelector` selector', () => {
      const anns = [fixtures.newPageNote(), fixtures.newAnnotation()];
      for (const ann of anns) {
        assert.isUndefined(pageLabel(ann));
      }
    });
  });

  describe('hasBeenEdited', () => {
    it('should return false if created and updated timestamps are equal', () => {
      const annotation = fakeAnnotation({
        created: '2020-10-28T15:35:26.822151+00:00',
        updated: '2020-10-28T15:35:26.822151+00:00',
      });
      assert.isFalse(annotationMetadata.hasBeenEdited(annotation));
    });

    it('should return false if created and updated timestamps are very close', () => {
      // Sub-second difference
      const annotation1 = fakeAnnotation({
        created: '2020-10-28T15:35:26.822151+00:00',
        updated: '2020-10-28T15:35:26.822450+00:00',
      });
      // Slightly more than one-second difference
      const annotation2 = fakeAnnotation({
        created: '2020-10-28T15:35:26.822151+00:00',
        updated: '2020-10-28T15:35:27.822450+00:00',
      });
      assert.isFalse(annotationMetadata.hasBeenEdited(annotation1));
      assert.isFalse(annotationMetadata.hasBeenEdited(annotation2));
    });

    it('should return true if created and updated timestamps are meaningfully different', () => {
      // Few seconds difference
      const annotation1 = fakeAnnotation({
        created: '2020-10-28T15:35:26.822151+00:00',
        updated: '2020-10-28T15:35:29.555555+00:00',
      });
      // A few days
      const annotation2 = fakeAnnotation({
        created: '2020-10-28T15:35:26.822151+00:00',
        updated: '2020-10-30T15:35:27.822450+00:00',
      });
      assert.isTrue(annotationMetadata.hasBeenEdited(annotation1));
      assert.isTrue(annotationMetadata.hasBeenEdited(annotation2));
    });

    context('invalid created or updated dates', () => {
      it('should return false if created and updated are equal', () => {
        const annotation = fakeAnnotation({
          created: 'nope',
          updated: 'nope',
        });
        assert.isFalse(annotationMetadata.hasBeenEdited(annotation));
      });

      it('should return false if updated is not present', () => {
        const annotation = fakeAnnotation({
          created: '2020-10-28T15:35:26.822151+00:00',
        });
        assert.isFalse(annotationMetadata.hasBeenEdited(annotation));
      });

      it('should return false if created and updated are different but problematic', () => {
        const annotation = fakeAnnotation({
          created: 'nope',
          updated: 'nope!',
        });
        assert.isFalse(annotationMetadata.hasBeenEdited(annotation));
      });
    });
  });
});
